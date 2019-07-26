from dallinger.experiment import Experiment
from dallinger.information import Meme
from dallinger.models import Network
from dallinger.models import Node
from dallinger.models import Participant
from dallinger.networks import DiscreteGenerational
from dallinger.nodes import Agent
from dallinger.nodes import Environment
from dallinger.nodes import Source
from sqlalchemy import and_, func
from sqlalchemy.sql.expression import cast
from sqlalchemy import Integer
from dallinger import db
from flask import Blueprint, Response

import numpy as np
import random
import json
# import pysnooper
# import pysnooper

import logging
logger = logging.getLogger(__file__)

class UWPFWP(Experiment):
	"""Utility Weighted Particle Filter with People.
	
	qualification_blacklist = UWSPF
	assign_qualifications = true
	approve_requirement = 95
	group_name = UWSPF
	"""

	@property
	def public_properties(self):
		return {
		'generation_size':60, 
		'generations': 1, 
		'num_fixed_order_experimental_networks_per_condition': 4,
		'num_random_order_experimental_networks_per_condition': 4,
		'num_practice_networks_per_condition': 4,
		'payout_blue': 'true',
		'cover_story': 'true'
		}

	def __init__(self, session=None):
		super(UWPFWP, self).__init__(session)
		import models
		self.models = models
		self.known_classes["particlefilter"] = self.models.ParticleFilter
		self.set_known_classes()
		
		# These variables are potentially needed on every invocation 
		self.set_params()
		self.assign_proportions_to_networks()

		# These variables are only needed when launching the experiment 
		if session and not self.networks():
			self.setup()
		self.save()

	# @pysnooper.snoop()
	def set_known_classes(self):
		self.known_classes["trialbonus"] = self.models.TrialBonus
		self.known_classes["particle"] = self.models.Particle
		self.known_classes['comprehensiontest'] = self.models.ComprehensionTest
		self.known_classes['generativemodel'] = self.models.GenerativeModel
		self.known_classes["particlefilter"] = self.models.ParticleFilter
		self.known_classes["networkparentsamples"] = self.models.NetworkParentSamples

	def set_params(self):
		self.condition_names = {0:"asocial"} # 2:"social_with_info", 1:"social"
		self.nconditions = len(self.condition_names)
		self.generation_size = self.public_properties['generation_size']
		self.generations = self.public_properties['generations']
		self.num_fixed_order_experimental_networks_per_condition = self.public_properties['num_fixed_order_experimental_networks_per_condition']
		self.num_random_order_experimental_networks_per_condition = self.public_properties['num_random_order_experimental_networks_per_condition']
		self.num_experimental_networks_per_condition = self.experimental_decisions = self.num_fixed_order_experimental_networks_per_condition + self.num_random_order_experimental_networks_per_condition
		self.num_practice_networks_per_condition = self.practice_decisions = self.public_properties['num_practice_networks_per_condition']
		self.number_of_networks = (self.num_practice_networks_per_condition + self.num_experimental_networks_per_condition) * self.nconditions
		self.nodes_per_generation = self.generation_size * self.nconditions * (self.num_practice_networks_per_condition + self.num_experimental_networks_per_condition)
		self.initial_recruitment_size = self.nconditions * self.generation_size
		self.bonus_max = 1.

	def assign_conditions_to_networks(self):
		self.conditions = list(self.condition_names.values()) * (self.num_practice_networks_per_condition + self.num_experimental_networks_per_condition)

	def assign_proportions_to_networks(self):
		# proprtions for practice networks
		self.practice_network_proportions = [.53, .46, .47, .54]
		# self.practice_network_proportions = [.30, .46, .47, .54]
		
		# proprtions for experimental networks (fixed order and random order)
		self.fixed_order_experimental_network_proportions = [.48, .52, .51, .49]
		self.random_order_experimental_network_proportions = [.48, .52, .51, .49]

		# checlk the proportions match the number of networks in total
		ntrials = len(self.practice_network_proportions) + len(self.fixed_order_experimental_network_proportions) + len(self.random_order_experimental_network_proportions)
		
		# self.log("{};{};{}".format(ntrials, self.num_practice_networks_per_condition, self.num_experimental_networks_per_condition), '---->')
		assert ntrials == self.experimental_decisions + self.practice_decisions

		# concatenate a proprtion scedule for each condition
		self.proportion_schedule = self.practice_network_proportions + self.fixed_order_experimental_network_proportions + self.random_order_experimental_network_proportions

		# drop onto network conditions
		self.network_proportions = np.repeat(self.proportion_schedule, self.nconditions)

	def assign_roles_to_networks(self):
		self.role_schedule = (['practice'] * self.num_practice_networks_per_condition) + (['experiment'] * self.num_experimental_networks_per_condition)

		self.roles = np.repeat(self.role_schedule, self.nconditions)

	def assign_decision_indices_to_networks(self):
		self.decision_indices = np.repeat(list(range(self.practice_decisions + self.experimental_decisions)), self.nconditions).astype(int)
		
	def setup(self):
		"""First time setup."""
		for _ in range(self.number_of_networks):
			network = self.create_network()
			self.session.add(network)
			self.session.commit()
		
		self.sample_parents()
		self.assign_conditions_to_networks()
		self.assign_decision_indices_to_networks()
		self.assign_roles_to_networks()
		
		for i, net in enumerate(self.networks()):
			net.max_size = net.max_size + 1  # make room for environment node.
			net.role = self.roles[i]
			net.condition = self.conditions[i]
			net.decision_index = self.decision_indices[i]
			datasource = self.models.GenerativeModel(network=net)
			datasource.create_state(proportion=self.network_proportions[i])

	def create_network(self):
		"""Create a new network."""
		return self.models.ParticleFilter(generations=self.generations, generation_size=self.generation_size, initial_source=True)

	# @pysnooper.snoop()
	def sample_parents(self):
		"""Sample parent assignments for all gens & networks pre-hoc. 
		   This is possible b/c transmission dynamics is random sampling.
		"""
		for network in self.networks():
			self.models.NetworkParentSamples(network = network)

	# @pysnooper.snoop()
	def sample_network_for_new_participant(self, participant):
		"""Obtain a netwokr for a participant who has not yet been assigned to a condition"""
		nets = Network.query.filter(Network.property4 == repr(0)).filter_by(full = False).all()

		# Establish largest generation attested in nodes table (property2 = generation)
		maximum_generation_among_nodes = self.session.query(func.max(self.models.Particle.property2)).scalar()

		self.log("{}".format(maximum_generation_among_nodes), "--**maxgen**-->>")

		# count nodes showing generation
		number_of_nodes_with_maximum_generation = self.session.query(func.count(self.models.Particle.property2).label('count')).filter(self.models.Particle.property2 == maximum_generation_among_nodes).filter_by(failed = False).scalar()

		# self.log("{}".format(number_of_nodes_with_maximum_generation), "--**num nodes with maxgenmaxgen**-->>")

		# if number of nodes with this generation if the same as the recruitment batch size, we're at a new generation
		current_generation = repr(int(maximum_generation_among_nodes) + 1) if number_of_nodes_with_maximum_generation == self.nodes_per_generation else maximum_generation_among_nodes

		# self.log("{}".format(self.nodes_per_generation), "--**nodespergen**-->>")

		self.log("{}".format(current_generation), "--**currentgen**-->>")

		# Goal: select a condition that does not already have a full generation of workers 
		# 1: count unique participant ids in all nodes
		# 2: sum this count by condition by grouping
		# 3: subset down to just this generation
		# 4: don't count failed nodes
		condition_counts = self.session.query(func.count(self.models.Particle.participant_id.distinct()).label('count'), self.models.Particle.condition) \
				.group_by(self.models.Particle.condition) \
				.filter(self.models.Particle.property2 == current_generation) \
				.filter_by(failed = False)\
				.all()

		self.log("{}".format(condition_counts), "--**condition counts**-->>")

		# if this is the first Particle node in the experiment, all decions_index = 0 networks are availible
		# property4 = decision_index
		if not condition_counts:
			return random.choice(nets)

		condition_counts = dict([c[::-1] for c in condition_counts])

		# filter out any networks who already have enough nodes in this generation
		availible_conditions = list(filter(lambda c: condition_counts[c] < self.generation_size, condition_counts.keys())) + list(filter(lambda k: k not in condition_counts, self.condition_names.values()))
		# self.log("{}".format(condition_counts),"--**groupby network id condition_counts-->>")
		# self.log("{}".format(availible_conditions),"--**availible conditions-->>")

		nets = [net for net in nets if net.condition in availible_conditions]
		return random.choice(nets)

	def sample_network_for_existing_participant(self, participant, participant_nodes):
		"""Obtain a netwokr for a participant who has already been assigned to a condition by completeing earlier rounds"""
		
		# What condition is this participant in?
		participant_condition = participant_nodes[0].property5 # node.property5 = condition

		# which networks has this participant already completed?
		networks_participated_in = [node.network_id for node in participant_nodes]
		
		# How many decisions has the particiapnt already made?
		completed_decisions = len(networks_participated_in)

		# When the participant has completed all networks in their condition, their experiment is over
		# returning None throws an error to the fronted which directs to questionnaire and completion
		if completed_decisions == self.num_practice_networks_per_condition + self.num_experimental_networks_per_condition:
			return None

		nfixed = self.num_practice_networks_per_condition + self.num_fixed_order_experimental_networks_per_condition

		# If the participant must still follow the fixed network order
		if completed_decisions < nfixed:
			# find the network that is next in the participant's schedule
			# match on completed decsions b/c decision_index counts from zero but completed_decisions count from one
			return Network.query.filter(and_(Network.property4 == repr(completed_decisions), Network.property5 == participant_condition)).filter_by(full = False).one()

		# If it is time to sample a network at random
		else:
			# find networks which match the participant's condition and werent' fixed order nets
			matched_condition_experimental_networks = Network.query.filter(and_(cast(Network.property4, Integer) >= nfixed, Network.property5 == participant_condition)).filter_by(full = False).all()
			
			# subset further to networks not already participated in (because here decision index doesnt guide use)
			availible_options = [net for net in matched_condition_experimental_networks if net.id not in networks_participated_in]
			
			# choose randomly among this set
			chosen_network = random.choice(availible_options)

		return chosen_network

	# @pysnooper.snoop()
	def get_network_for_participant(self, participant):
		"""Find a network for a participant."""
		key = "--->> Participant: {}; ".format(participant.id)
		participant_nodes = Node.query.filter_by(participant_id=participant.id).all()
		if not participant_nodes:
			chosen_network = self.sample_network_for_new_participant(participant)
		else:
			chosen_network = self.sample_network_for_existing_participant(participant, participant_nodes)

		if chosen_network is not None:
			self.log("Assigned to network: {}".format(chosen_network.id), key)

		else:
			self.log("Requested a network but was assigned None. Participant already created {} nodes.".format(len(participant_nodes)), key)

		return chosen_network

	# @pysnooper.snoop()
	def create_node(self, network, participant):
		"""Make a new node for participants."""
		memes = [i for i in participant.infos() if i.type == "meme"]
		if len(memes) >= (self.practice_decisions + self.experimental_decisions):
			raise Exception
		
		return self.models.Particle(network=network,participant=participant)

	# @pysnooper.snoop()
	def add_node_to_network(self, node, network):
		"""Add participant's node to a network."""
		network.add_node(node)
		node.receive()

		if isinstance(node, self.models.Particle):
			node.proportion = self.proportion_schedule[network.decision_index]
			# keep track of how which order the participant is doing neteworks
			completed_decisions = self.models.Particle.query.filter_by(participant_id=node.participant_id, failed = False, type = 'particle').count()
			node.decision_index = completed_decisions

		if node.generation > 0:

			# grab pre-sampled parent schedule for this network
			parentschedule = self.models.NetworkParentSamples.query.filter_by(network_id = network.id).one()

			details = parentschedule.details
			
			# isolaterab the parent indices for this generation
			parent_index_lookup = json.loads(parentschedule.details)[str(node.generation)]

			# list all nodes from the previous generation
			# and sort the node_ids
			all_nodes_previous_generation = self.models.Particle.query.filter(self.models.Particle.property2 == repr(int(node.generation) - 1)).filter_by(network_id = network.id, failed = False).all()
			previous_generation_node_ids_sorted = [previous_node.id for previous_node in all_nodes_previous_generation]
			previous_generation_node_ids_sorted.sort()

			# list all the nodes in the current generation so far
			# and sort the node_ids
			all_nodes_this_generation_so_far = self.models.Particle.query.filter(self.models.Particle.property2 == repr(int(node.generation))).filter_by(network_id = network.id, failed = False).all()
			current_generation_node_ids_sorted = [existing_node.id for existing_node in all_nodes_this_generation_so_far]
			current_generation_node_ids_sorted.sort()

			# make a lookup table that takes a numerical index and returns a node_id for nodes at the previous generation 
			previous_generation_node_id_lookup = dict(zip(list(range(len(all_nodes_previous_generation))), previous_generation_node_ids_sorted))
			
			# make a lookup table that takes a node_id and returns a numerical index for nodes at the current generation
			current_node_order_lookup = dict(zip(current_generation_node_ids_sorted, list(range(len(all_nodes_this_generation_so_far)))))

			# find the pre-sampled numerical index of the parent for the current node
			parent_index = parent_index_lookup[repr(current_node_order_lookup[node.id])]

			# and lookup the node_id of the previous-generation node at that numerical index
			parent_id = previous_generation_node_id_lookup[parent_index]

			parent = self.models.Particle.query.filter_by(network_id = network.id, id = parent_id).one()
			parent.connect(whom=node)
			parent.transmit(what=Meme, to_whom=node)

		node.receive()

	def recruit(self):
		"""Recruit participants if necessary."""
		num_approved = len(Participant.query.filter_by(status="approved").all())

		self.log("num_approved: {}".format(num_approved), "--** recruit called **-->>")

		end_of_generation = num_approved % (self.generation_size * self.nconditions) == 0

		self.log("end_of_generation: {}".format(end_of_generation), "--** recruit called **-->>")

		self.log("completion threshold: {}; met? {}".format(self.generations * self.generation_size * self.nconditions, num_approved >= (self.generations * self.generation_size * self.nconditions)), "--** recruit called **-->>")

		complete = num_approved >= (self.generations * self.generation_size * self.nconditions)
		if complete:
			self.log("All networks full: closing recruitment", "--** end recruit **-->>")
			self.recruiter.close_recruitment()
		elif end_of_generation:
			self.log("generation finished, recruiting another", "--** recruit **-->>")
			self.recruiter.recruit(n=(self.generation_size * self.nconditions))

	def bonus(self, participant):
		"""Calculate a participants bonus."""
		infos = participant.infos()
		
		# self.log("{}".format(infos), "--**bonus infos-->>")

		totalbonus = 0

		for info in infos:
			if info.type == "meme":
				contents = json.loads(info.contents)
				if contents["is_practice"] == False:
					totalbonus += (contents["current_bonus"] / 1000.)

		totalbonus = round(totalbonus, 2)

		if totalbonus > self.bonus_max:
			totalbonus = self.bonus_max
		return totalbonus
   
	def fail_participant(self, participant):
		"""Fail all the nodes of a participant."""
		participant_nodes = Node.query.filter_by(
			participant_id=participant.id, failed=False
		).all()

		if participant_nodes:
			for node in participant_nodes:
				node.fail()
		self.log("--**fail participant**-->>")
		
	def attention_check(self, participant=None):
		"""Check a participant paid attention."""
		infos = participant.infos()

		if not infos:
			return False
		
		passed =  np.any([info.passed for info in infos if info.type == 'comprehensiontest'])

		if not passed:
			self.log("failed", "--** attentioncheck for participant: {} ** -->>".format(participant.id))

		return passed

	def data_check(self, participant):
		"""Check a participants data."""
		nodes = Node.query.filter_by(participant_id=participant.id).all()

		if not nodes:
			return False

		if len(nodes) != self.num_practice_networks_per_condition + self.num_experimental_networks_per_condition:
			print("Error: Participant has {} nodes. Data check failed"
				  .format(len(nodes)))
			return False

		nets = [n.network_id for n in nodes]
		if len(nets) != len(set(nets)):
			print("Error: Participant participated in the same network \
				   multiple times. Data check failed")
			return False

		return True

	def is_complete(self):
		"""Determine whether the experiment is complete"""
		node_count = self.session.query(func.count(self.models.Particle.id.label('count'))).filter_by(failed = False).scalar()

		participant_count = self.session.query(func.count(Participant.id.label('count'))).filter_by(failed = False, status = 'approved').scalar()

		return True if (node_count >= (self.nodes_per_generation * self.generations) & (participant_count >= (self.generation_size * self.generations * self.nconditions))) else False

	# @pysnooper.snoop()
	def getnet(self, network_id):
		net = Network.query.filter_by(id = network_id).one()
		return net

extra_routes = Blueprint(
	'extra_routes',
	__name__,
	template_folder='templates',
	static_folder='static')

@extra_routes.route("/network/<network_id>/getnet/", methods=["GET"])
def getnet(network_id):
	try:
		exp = UWPFWP(db.session)

		net = exp.getnet(network_id)

		return Response(json.dumps({"network":{"property4":net.__json__()["property4"]}}), status=200, mimetype="application/json")

	except Exception:
		db.logger.exception('Error fetching network info')
		return Response(status=403, mimetype='application/json')

@extra_routes.route("/particles/<int:network_id>/<int:generation>/", methods=["GET"])
def getparticles(network_id, generation):
	logger.info("--->>> generation: {}, {}".format(generation, type(generation)))

	if generation == 0:
		return Response(json.dumps({"k":-1, "n":-1}), status=200, mimetype="application/json")

	# @pysnooper.snoop()
	def f(network_id, generation):
		# get an exp instance
		exp = UWPFWP(db.session)

		# get the network for this id
		net = exp.getnet(network_id)

		# get all nodes from the previous generation
		previous_generation_nodes = list(filter(lambda node: node.generation == (generation - 1), net.nodes(failed = False, type = exp.models.Particle)))

		# find the pre-sampled parentschedule for this network
		parentschedule = exp.models.NetworkParentSamples.query.filter_by(network_id = network_id).one()

		# isolate the numerical indicies of the parents sampled for the current generation
		all_parents_indices = json.loads(parentschedule.details)[str(generation)].values()

		# line up the node_ids from the previous gen in order
		previous_generation_node_ids_sorted = [previous_node.id for previous_node in previous_generation_nodes]
		previous_generation_node_ids_sorted.sort()
		
		# and make a lookup table so we can retrieve a speicifc node_id from a numerical parent_index
		previous_generation_node_id_lookup = dict(zip(list(range(len(previous_generation_nodes))), previous_generation_node_ids_sorted))

		# retreive the relevant node_ids for all sapled parents
		all_parent_node_ids = [previous_generation_node_id_lookup[index] for index in all_parents_indices]

		# make the node objects accessible via node_id
		previous_generation = dict(zip([node.id for node in previous_generation_nodes], previous_generation_nodes))

		choices = [json.loads(previous_generation[node_id].infos(type = Meme)[0].contents)["choice"] for node_id in all_parent_node_ids]

		# make a list of whether each parent node chose blue or not
		chose_blue = [json.loads(previous_generation[node_id].infos(type = Meme)[0].contents)["choice"] == "blue" for node_id in all_parent_node_ids]

		# count the number who did choose blue
		# this is the nunmbr of current gen participants whose social information was "someone chose blue"
		k = sum(chose_blue)

		# count the generation size and check it liens up with the exp
		n = len(previous_generation_nodes)
		assert n == exp.generation_size

		return Response(json.dumps({"k":k, "n":n}), status=200, mimetype="application/json")

	try:
		return f(network_id, generation)

	except Exception:
		db.logger.exception('Error fetching network info')
		return Response(status=403, mimetype='application/json')