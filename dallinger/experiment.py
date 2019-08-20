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
import pysnooper
from operator import attrgetter
from collections import Counter

import logging
logger = logging.getLogger(__file__)

DEBUG = True

class UWPFWP(Experiment):
	"""Utility Weighted self.models.Particle Filter with People.
	 
	 TODO: 
	 - stress test new overflow mechanism
	 - debug multiple replications ofoverflow conditions
	"""

	@property
	def public_properties(self):
		return {
		'generation_size':2, 
		'generations': 3, 
		'num_replications_per_condition':1,
		'num_fixed_order_experimental_networks_per_experiment': 1,
		'num_random_order_experimental_networks_per_experiment': 1,
		'num_practice_networks_per_experiment': 1,
		'cover_story': 'true',
		'payout_blue':'true',
		'bonus_max': 1,
		}

	def __init__(self, session=None):
		super(UWPFWP, self).__init__(session)
		import models
		self.models = models
		self.known_classes["particlefilter"] = self.models.ParticleFilter
		self.set_known_classes()
		
		# These variables are potentially needed on every invocation 
		self.set_params()

		# These variables are only needed when launching the experiment 
		if session and not self.networks():
			self.setup()
		self.save()

	def set_known_classes(self):
		self.known_classes["trialbonus"] = self.models.TrialBonus
		self.known_classes["particle"] = self.models.Particle
		self.known_classes['comprehensiontest'] = self.models.ComprehensionTest
		self.known_classes['generativemodel'] = self.models.GenerativeModel
		self.known_classes["particlefilter"] = self.models.ParticleFilter
		self.known_classes["networkrandomattributes"] = self.models.NetworkRandomAttributes
		self.known_classes["overflow"] = self.models.OverFlow
		self.known_classes["overflowparticle"] = self.models.OverflowParticle

	
	def set_params(self):
		"""
		Notes:
		- A condition is a manipulation
		- An experiment is a single replication of a condition
		- Information does not flow between experiments
		- A network is a single "Trial", with a constant proportion but generation-verying stimulus relations of that proportion
		- Every experiment includes some practice networks and some experimental networks (fixed order and random order)
		"""

		# Public Parameters
		self.generation_size = self.public_properties['generation_size']
		self.generations = self.public_properties['generations']
		self.num_replications_per_condition = self.public_properties['num_replications_per_condition']
		self.num_fixed_order_experimental_networks_per_experiment = self.public_properties['num_fixed_order_experimental_networks_per_experiment']
		self.num_random_order_experimental_networks_per_experiment = self.public_properties['num_random_order_experimental_networks_per_experiment']
		self.num_practice_networks_per_experiment = self.practice_decisions = self.public_properties['num_practice_networks_per_experiment']
		self.bonus_max = self.public_properties['bonus_max']
		self.practice_network_proportions = [.53, .46, .47, .54] if not DEBUG else [.9]
		self.fixed_order_experimental_network_proportions = self.random_order_experimental_network_proportions = [.48, .52, .51, .49] if not DEBUG else [.2]
		assert len(self.practice_network_proportions) == self.num_practice_networks_per_experiment
		assert len(self.fixed_order_experimental_network_proportions) == self.num_fixed_order_experimental_networks_per_experiment
		assert len(self.random_order_experimental_network_proportions) == self.num_random_order_experimental_networks_per_experiment
		
		# Conditions
		# SOC:N-U
		# SOC:W-U
		# ASO:N-U
		# ASO:W-U
		# SWI:N-U
		# SWI:W-U
		# OVF:W-U
		# OVF:N-U
		#self.condition_counts = {"SOC:N-U":self.num_replications_per_condition}
		self.condition_counts = {"SOC:N-U":self.num_replications_per_condition,
								 "OVF:W-U":1
								 }

		# Derrived Quantities
		self.num_experiments = sum(self.condition_counts.values())
		self.planned_overflow = sum([self.condition_counts[overflow_key] for overflow_key in filter(lambda k: "OVF" in k, self.condition_counts.keys())]) * self.generation_size
		self.num_experimental_networks_per_experiment = self.experimental_decisions = self.num_fixed_order_experimental_networks_per_experiment + self.num_random_order_experimental_networks_per_experiment
		self.num_networks_total = (self.num_practice_networks_per_experiment + self.num_experimental_networks_per_experiment) * self.num_experiments
		self.num_participants_per_generation = self.initial_recruitment_size = self.generation_size * self.num_experiments
		self.num_experimental_participants_per_generation = (self.num_experiments - 1) * self.generation_size
		self.num_nodes_per_generation = self.generation_size * self.num_networks_total 
		self.num_experimental_nodes_per_generation = ((self.num_practice_networks_per_experiment + self.num_experimental_networks_per_experiment) * (self.num_experiments - 1)) * self.generation_size

	def create_network(self, condition, replication, role, decision_index, proportion):
		# identify entwork type: overflow?
		network_type = self.models.ParticleFilter if not ("OVF" in condition) else self.models.OverFlow
		
		# build network and add to session
		net = network_type(generations=self.generations, generation_size=self.generation_size, replication=replication)
			
		# update network parameters
		net.max_size = net.max_size + 1  # make room for network random attributes node
		net.role = role
		net.condition = condition
		net.decision_index = decision_index
		self.session.add(net)
		
		# create the Genertative process for stimuli
		datasource = self.models.GenerativeModel(network=net)
		datasource.create_state(proportion=proportion)
		return net
		
	def setup(self):
		"""First time setup."""
		for (condition, replications) in self.condition_counts.items():
			for replication in range(replications):
				for p in range(self.num_practice_networks_per_experiment):
					network = self.create_network(condition = condition, replication = replication, role = 'practice', decision_index = p, proportion = self.practice_network_proportions[p])
					self.models.NetworkRandomAttributes(network = network)
					
				for f in range(self.num_fixed_order_experimental_networks_per_experiment):
					decision_index = self.num_practice_networks_per_experiment + f
					network = self.create_network(condition = condition, replication = replication, role = 'experiment', decision_index = decision_index, proportion = self.fixed_order_experimental_network_proportions[f])
					self.models.NetworkRandomAttributes(network = network)

				for r in range(self.num_random_order_experimental_networks_per_experiment):
					decision_index = self.num_practice_networks_per_experiment + self.num_fixed_order_experimental_networks_per_experiment + r
					network = self.create_network(condition = condition, replication = replication, role = 'experiment', decision_index = decision_index, proportion = self.random_order_experimental_network_proportions[r])
					self.models.NetworkRandomAttributes(network = network)
		
		self.session.commit()

	def network_occupancy_counts(self):
		"""How many participants are already working or have completed working in each network?"""

		arbitrary_network = self.models.ParticleFilter.query.filter_by(failed = False, full = False).first()

		if not arbitrary_network:
			return []

		current_generation = self.models.NetworkRandomAttributes.query.filter_by(network_id = arbitrary_network.id).one().current_generation

		# Goal: identify networks that do not already have a full generation of workers working / completed 
		# 1: count unique participant ids in all nodes
		# 2: sum this count by network (by grouping)
		# 3: subset down to just this generation
		# 4: don't count failed nodes
		network_counts = self.session.query(func.count(self.models.Particle.participant_id.distinct()).label('count'), self.models.Particle.network_id) \
				.group_by(self.models.Particle.network_id) \
				.filter(self.models.Particle.property2 == repr(current_generation)) \
				.filter_by(failed = False)\
				.all()

		# reverse the items so that the format is [(network_id, count), ...]
		return [c[::-1] for c in network_counts]

	# #@pysnooper.snoop()
	def get_network_for_existing_participant(self, participant, participant_nodes):
		"""Obtain a netwokr for a participant who has already been assigned to a condition by completeing earlier rounds"""
		
		# What condition is this participant in?
		participant_condition = participant_nodes[0].property5 # node.property5 = condition

		# which networks has this participant already completed?
		networks_participated_in = [node.network_id for node in participant_nodes]

		# What replciation is this participant in?
		participant_replication = self.models.Network.query.get(networks_participated_in[0]).property3 # network.property3 = replication
		
		# How many decisions has the particiapnt already made?
		completed_decisions = len(networks_participated_in)

		# When the participant has completed all networks in their condition, their experiment is over
		# returning None throws an error to the fronted which directs to questionnaire and completion
		if completed_decisions == self.num_practice_networks_per_experiment + self.num_experimental_networks_per_experiment:
			return None

		nfixed = self.num_practice_networks_per_experiment + self.num_fixed_order_experimental_networks_per_experiment

		# If the participant must still follow the fixed network order
		if completed_decisions < nfixed:
			# find the network that is next in the participant's schedule
			# match on completed decsions b/c decision_index counts from zero but completed_decisions count from one
			return self.models.Network.query.filter(and_(self.models.ParticleFilter.property4 == repr(completed_decisions), self.models.ParticleFilter.property5 == participant_condition, self.models.ParticleFilter.property3 == participant_replication)).filter_by(full = False).one()

		# If it is time to sample a network at random
		else:
			# find networks which match the participant's condition and werent' fixed order nets
			matched_condition_experimental_networks = self.models.Network.query.filter(and_(cast(self.models.ParticleFilter.property4, Integer) >= nfixed, self.models.ParticleFilter.property5 == participant_condition, self.models.ParticleFilter.property3 == participant_replication)).filter_by(full = False).all()
			
			# subset further to networks not already participated in (because here decision index doesnt guide use)
			availible_options = [net for net in matched_condition_experimental_networks if net.id not in networks_participated_in]
			
			# choose randomly among this set
			chosen_network = random.choice(availible_options)

		return chosen_network

	# #@pysnooper.snoop(prefix = "@snoop: ")
	def get_network_for_new_participant(self, participant):
		key = "experiment.py >> get_network_for_new_participant ({}); ".format(participant.id)

		# Get all first-trial networks
		nets = self.models.ParticleFilter.query.filter_by(full = False).filter(self.models.ParticleFilter.property4 == repr(0)).all()

		# And their IDs
		net_ids = [net.id for net in nets]

		# Get the occupancy counts for all networks
		network_counts = self.network_occupancy_counts()

		if not network_counts:
			if nets:
				# all networks have open slots, choose randomly
				return random.choice(nets)
			else:
				# must be the end of the experiment, direct ps to overflow
				return self.models.OverFlow.query.order_by(self.models.OverFlow.property4.asc()).first()

		# Subset netowek counts down to only first trial networks
		network_counts = dict(filter(lambda count: count[0] in net_ids, network_counts))
		self.log("Network Counts: {}".format(network_counts), key)

		# Find networks that have some participants but are not full
		not_saturated = dict(filter(lambda count: count[1] < self.generation_size, network_counts.items()))
		self.log("These networks have some participants, but are not saturated: {}".format(not_saturated), key)

		self.log("dict(network_counts).keys(): {}; dict(network_counts): {}; net_ids: {}".format(network_counts.keys(), network_counts, net_ids), key)

		# And networks that have no participants yet
		not_started = list(filter(lambda net_id: net_id not in network_counts.keys(), net_ids))
		self.log("These networks do not have any participants yet this generation: {}".format(not_started), key)

		# filter out any conditions who already have enough nodes in this generation
		availible_networks = [net for net in nets if net.id in not_started + list(not_saturated.keys())]

		if not availible_networks:
			self.log("No experimental networks are availible. Returning Overflow network.", key)
			return self.models.OverFlow.query.order_by(self.models.OverFlow.property4.asc()).first()

		self.log("The availible networks are: {}".format([net.id for net in availible_networks]), key)
		return random.choice(availible_networks)

	def assign_slot(self, participant, network):
		node_type = self.models.OverflowParticle if isinstance(network, self.models.OverFlow) else self.models.Particle

		# estbalish current generation
		current_generation = self.models.NetworkRandomAttributes.query.filter_by(network_id = network.id).one().current_generation

		all_nodes_this_network_this_generation_so_far = node_type.query.filter(node_type.property2 == repr(int(current_generation))).filter_by(network_id = network.id, failed = False).all()

		# which slots (1, ..., n) are already occupied?
		all_node_slots_already_taken = [existing_node.slot for existing_node in all_nodes_this_network_this_generation_so_far]

		# which slots remain availible for new nodes?
		node_slots_still_availible = [slot for slot in range(self.generation_size) if slot not in all_node_slots_already_taken]

		return random.choice(node_slots_still_availible)

	#@pysnooper.snoop()
	def get_network_for_participant(self, participant):
		"""Find a network for a participant."""
		key = "experiment.py >> get_network_for_participant ({}); ".format(participant.id)
		participant_nodes = participant.nodes()
		if not participant_nodes:
			chosen_network = self.get_network_for_new_participant(participant)
		else:
			chosen_network = self.get_network_for_existing_participant(participant, participant_nodes)

		if chosen_network is not None:
			self.log("Assigned to network: {}".format(chosen_network.id), key)

		else:
			self.log("Requested a network but was assigned None.".format(len(participant_nodes)), key)

		return chosen_network

	# #@pysnooper.snoop()
	def create_node(self, network, participant):
		"""Make a new node for participants."""
		memes = [i for i in participant.infos() if i.type == "meme"]
		if len(memes) >= (self.num_practice_networks_per_experiment + self.num_experimental_networks_per_experiment):
			raise Exception

		# has this partciipants alreeady been assigned a "slot"?
		nodes = participant.nodes()
		slot = self.assign_slot(participant, network) if not nodes else nodes[0].slot
		return self.models.Particle(network=network,participant=participant, slot = slot) if ("OVF" not in network.condition) else self.models.OverflowParticle(network=network,participant=participant, slot = slot)

	# #@pysnooper.snoop()
	def add_node_to_network(self, node, network):
		"""Add participant's node to a network."""
		network.add_node(node)
		node.receive()

		if isinstance(node, self.models.Particle) or isinstance(node, self.models.OverflowParticle):

			node_type = self.models.OverflowParticle if isinstance(node, self.models.OverflowParticle) else self.models.Particle
			
			node.proportion = float(self.models.GenerativeModel.query.filter_by(network_id = network.id).one().property5) # property5 = proportion
			# keep track of how which order the participant is doing neteworks
			completed_decisions = node_type.query.filter_by(participant_id=node.participant_id, failed = False, type = 'particle').count()
			node.decision_index = completed_decisions

		if node.generation > 0 and not ("OVF" in node.condition):

			# retrieve randomised properties for thsi network
			network_attributes = self.models.NetworkRandomAttributes.query.filter_by(network_id = network.id).one()
			
			# grab pre-sampled parent schedule for this network
			# and isolate the parent indices for this generation
			parent_index_lookup = json.loads(network_attributes.details)['parentschedule'][str(node.generation)]

			# list all nodes from the previous generation
			# and sort the node_ids
			all_nodes_previous_generation = self.models.Particle.query.filter(self.models.Particle.property2 == repr(int(node.generation) - 1)).filter_by(network_id = network.id, failed = False).all()
			previous_generation_node_ids_sorted = [previous_node.id for previous_node in all_nodes_previous_generation]
			previous_generation_node_ids_sorted.sort()

			# make a lookup table that takes a numerical index and returns a node_id for nodes at the previous generation 
			previous_generation_node_id_lookup = dict(zip(list(range(len(all_nodes_previous_generation))), previous_generation_node_ids_sorted))

			# every node should have been assigned a "slot" from 0 to n - 1
			current_node_numerical_index = node.slot

			# find the pre-sampled numerical index of the parent for the current node
			parent_index = parent_index_lookup[repr(current_node_numerical_index)]

			# and lookup the node_id of the previous-generation node at that numerical index
			parent_id = previous_generation_node_id_lookup[parent_index]

			parent = self.models.Particle.query.filter_by(network_id = network.id, id = parent_id).one()
			parent.connect(whom=node)
			parent.transmit(what=Meme, to_whom=node)

		node.receive()

	#@pysnooper.snoop(prefix = "@snoop: ")
	def calculate_required_overrecruitment(self):
		key = "experiment.py >> calculate_required_overrecruitment: "
		if not self.models.OverflowParticle.query.all():
			self.log("No overflow nodes have been created. All initial overflow recruitments remain unstarted.", key)
			return 0

		arbitrary_network = self.models.ParticleFilter.query.first()

		# ...to estbalish current generation
		current_generation = self.models.NetworkRandomAttributes.query.filter_by(network_id = arbitrary_network.id).one().current_generation

		# We only need to check how many overflow nodes began
		# so we only need to check for overflownodes belonging to the first overflow networks
		# i.e., the overflow network with the smallest decision_index
		first_overflow_network_ids = [ovf_net.id for ovf_net in self.models.OverFlow.query.filter(self.models.OverFlow.property4 == repr(0)).all()] # property4 == decision_index 

		completed_participant_ids = [p.id for p in self.models.Participant.query.filter_by(failed = False).all()]

		next_generation_required_overflow = number_of_overflow_nodes_with_current_generation = self.models.OverflowParticle.query \
																							   .filter(self.models.OverflowParticle.property2 == repr(current_generation), self.models.OverflowParticle.network_id.in_(first_overflow_network_ids), self.models.OverflowParticle.participant_id.in_(completed_participant_ids)) \
																							   .filter_by(failed = False) \
																							   .count()
		if next_generation_required_overflow == 0:
			self.log("No overflow partciipants were created during geneeration {}. All current overflow recruitments remain unstarted.".format(current_generation), key)
			return 0
		
		# next_generation_required_overflow = number_of_overflow_nodes_with_current_generation = self.session.query(func.count(self.models.OverFlowSortingNode.property2).label('count')).filter(self.models.OverFlowSortingNode.property2 == maximum_generation_among_overflow_nodes).filter_by(failed = False).scalar()			
		self.log("In generation {}, {} overflow participants were created.".format(current_generation, number_of_overflow_nodes_with_current_generation), key)
		self.log("Planned over recruitment requires {} live overflow assignments at each generation. {} overflow assingments remain live from generation {}".format(self.planned_overflow, self.planned_overflow - number_of_overflow_nodes_with_current_generation, current_generation), key)

		overflow_networks = self.models.OverFlow.query.all()
		for overflow_network in overflow_networks:
			overflow_network.max_size = float(overflow_network.max_size) + next_generation_required_overflow
			self.log("Adding {} to max_size of overflow network (id = {}) (decision index = {}). Max_size is now: {}. This overflow network has {} overflowparticle nodes.".format(next_generation_required_overflow, overflow_network.id, overflow_network.property4, overflow_network.max_size, len(overflow_network.nodes())), key)
			# self.save()
		
		return min([self.planned_overflow, next_generation_required_overflow])

	def rollover_generation(self):
		key ="experiment.py >> rollover_generation: "

		# grab all network stats holders
		networkstats = self.models.NetworkRandomAttributes.query.all()

		# ...to estbalish finishing generation
		finishing_generation = networkstats[0].current_generation

		# fecth ids for all approved participants
		approved_participant_ids = [p.id for p in self.models.Participant.query.filter_by(failed = False, status = "approved").all()]

		# count all sorting nodes made by an approved participant at the generation now finishing
		finishing_generation_approved_node_count = self.models.Particle.query.filter(self.models.Particle.property2 == repr(finishing_generation), self.models.Particle.participant_id.in_(approved_participant_ids)).filter_by(failed = False).count()

		if not finishing_generation_approved_node_count == self.num_experimental_nodes_per_generation:
			self.log("Refusing to rollover generation. Node count from so-called finsihing generation is: {}; Required node count is: {}".format(finishing_generation_approved_node_count, self.num_experimental_nodes_per_generation), key)
			return

		for net in networkstats:
			net.current_generation = int(finishing_generation) + 1
			self.log("Rolled new generation for Network: {}; Was at generation {}. Now at generation: {}".format(net.network.id, finishing_generation, net.current_generation), key)

	#@pysnooper.snoop(prefix = "@snoop: ")
	def recruit(self):
		"""Recruit participants"""
		key = "experiment.py >> recruit: "
		
		# all approveed participnts
		approved_participants = self.models.Participant.query.filter_by(status="approved", failed = False).all()

		# all approved participant ids
		approved_participant_ids = [p.id for p in approved_participants]

		# grab a network...
		arbitrary_network = self.models.ParticleFilter.query.first()

		# ...to estbalish current generation
		current_generation = self.models.NetworkRandomAttributes.query.filter_by(network_id = arbitrary_network.id).one().current_generation

		# how many of this geenration's nodes have been approved?
		num_experimental_nodes_approved_this_generation = self.models.Particle.query.filter_by(failed = False).filter(self.models.Particle.participant_id.in_(approved_participant_ids), self.models.Particle.property2 == repr(current_generation)).count()

		# Is this generation complete?
		end_of_generation = num_experimental_nodes_approved_this_generation == self.num_experimental_nodes_per_generation

		self.log("Generation in Progress: {}; Experimental nodes (particles) approved: {}; Required: {}".format(current_generation, num_experimental_nodes_approved_this_generation, self.num_experimental_nodes_per_generation), key)
		self.log("End of generation: {}".format(end_of_generation), key)

		# Are all experimental generations complete?
		experimental_networks_complete = (current_generation == self.generations - 1) & (end_of_generation)

		# Have we finished recruiting experimental paricipants?
		if experimental_networks_complete:
			# How many overflow nodes are required according to the recruitments that have been issued?
			total_overflow_nodes_required = sum([ovf_net.max_size - 2 for ovf_net in self.models.OverFlow.query.all()])

			num_approved_overflow_nodes = self.models.OverflowParticle.query.filter_by(failed = False).filter(self.models.OverflowParticle.participant_id.in_(approved_participant_ids)).count()

			if num_approved_overflow_nodes >= total_overflow_nodes_required:
				self.log("All experimental networks are full. Overflow is full. Experiment complete: closing recruitment", key)
				self.recruiter.close_recruitment()

			else:
				self.log("All experimental networks are full. Overflow networks are not full (there are {} overflow particles, but there should be {}). Waiting...".format(self.models.OverflowParticle.query.filter_by(failed = False).count(), total_overflow_nodes_required), key)
				return

		# Or are more generations required? 
		elif end_of_generation:
			most_recently_approved_participant = max(approved_participants, key=attrgetter("end_time"))
			most_recently_approved_participant_nodes = most_recently_approved_participant.nodes()

			# not technically impossible that an overflow participant could create no nodes but still finish?
			if not most_recently_approved_participant_nodes: return
			
			# An overflow node can technically submit before any of a new generation of experimental participants submit
			# for example if an overflow ndoe from the prrviosu egenration submits just after all the previous gen's experimental participants
			# in this boundary case, dallinger thinks it's time to recruit a new generation
			# prevent this by checking the type of the most recent submitter whenever dallinger wants to recruit a new gnenrartion
			if most_recently_approved_participant_nodes[0].type == "overflowparticle":
				self.log("Doing nothing. Reason: An overflow participant trigered end_of_generation. This can only happen if an overflow participant submits after recruitment of a new generation, but before any experimental participants create a node.", key)
				return

			next_generation_required_overflow = self.calculate_required_overrecruitment()
			self.log("Required over-recruiment at the next generation is: {}.".format(next_generation_required_overflow), key)

			# If we got here, it's time to roll out a new generation
			# change state
			self.log("Generation finished.", key)
			self.rollover_generation()

			self.recruiter.recruit(n = (self.generation_size * (self.num_experiments - 1)) + next_generation_required_overflow)

	#@pysnooper.snoop()
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

		if len(nodes) != self.num_practice_networks_per_experiment + self.num_experimental_networks_per_experiment:
			print("Error: self.models.Participant has {} nodes. Data check failed"
				  .format(len(nodes)))
			return False

		nets = [n.network_id for n in nodes]
		if len(nets) != len(set(nets)):
			print("Error: self.models.Participant participated in the same network \
				   multiple times. Data check failed")
			return False

		return True

	# def is_complete(self):
	# 	"""Determine whether the experiment is complete"""
	# 	node_count = self.session.query(func.count(self.models.Particle.id.label('count'))).filter_by(failed = False).scalar()

	# 	participant_count = self.session.query(func.count(Participant.id.label('count'))).filter_by(failed = False, status = 'approved').scalar()

	# 	return True if (node_count >= (self.nodes_per_generation * self.generations) & (participant_count >= (self.generation_size * self.generations * self.nconditions))) else False

	#@pysnooper.snoop()
	def getnet(self, network_id):
		net = self.models.Network.query.filter_by(id = network_id).one()
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

		return Response(json.dumps({"network":{"property4":net.__json__()["property4"],"property5": net.__json__()["property5"]}}), status=200, mimetype="application/json")

	except Exception:
		db.logger.exception('Error fetching network info')
		return Response(status=403, mimetype='application/json')

@extra_routes.route("/random_attributes/<int:network_id>/<int:node_generation>/<int:node_slot>", methods=["GET"])
#@pysnooper.snoop()
def get_random_atttributes(network_id, node_generation, node_slot):
	# logger.info("--->>> generation: {}, {}".format(generation, type(generation)))

	exp = UWPFWP(db.session)

	# get the network for this id
	net = exp.getnet(network_id)

	# if we're at generation zero, just get color payout and button order
	if (node_generation == 0) or ("OVF" in net.property5):

		# establish whether we're dealing with an overflow node or not
		node_type = exp.models.OverflowParticle if isinstance(net, exp.models.OverFlow) else exp.models.Particle

		# grab the attributes for this netowrk
		network_attributes = exp.models.NetworkRandomAttributes.query.filter_by(network_id = network_id).one()

		# load detils
		data = json.loads(network_attributes.details)

		payout_colors, button_orders = data["payout_color"], data["button_order"]

		# Whcih color is incentivised for this node?
		node_payout = payout_colors[str(node_slot)]

		# Button order randomisation
		node_button_order = button_orders[str(node_slot)]
		
		return Response(json.dumps({"k":-1, "n":-1, "b":-1, "button_order":node_button_order, "node_utility":node_payout}), status=200, mimetype="application/json")

	#@pysnooper.snoop()
	def f(network_id = None, node_slot = None, node_generation = None):

		# establish whether we're dealing with an overflow node or not
		node_type = exp.models.OverflowParticle if isinstance(net, exp.models.OverFlow) else exp.models.Particle
		
		# grab all nodes from this network at the previos generation
		previous_generation_nodes = list(filter(lambda node: node.generation == (node_generation - 1), net.nodes(failed = False, type = node_type))) 		

		# grab the attributes for this netowrk
		network_attributes = exp.models.NetworkRandomAttributes.query.filter_by(network_id = network_id).one()

		# load detils
		data = json.loads(network_attributes.details)

		# isolate the three data fields
		parentschedule, payout_colors, button_orders = data["parentschedule"][str(node_generation)], data["payout_color"], data["button_order"]

		# estblish the incentivised colors for this node
		node_payout = payout_colors[str(node_slot)]

		previous_generation_choices = np.array([json.loads(node.infos(type = Meme)[0].contents)["choice"] for node in previous_generation_nodes])

		previous_generation_utilities = np.array([payout_colors[str(node.slot)] for node in previous_generation_nodes])
		
		# make a list of whether each parent node chose blue or not
		chose_blue = previous_generation_choices == "blue"

		# count how many parents selected their incentivised color
		k = (previous_generation_choices == previous_generation_utilities).sum()

		# count the number who did choose blue
		# this is the nunmbr of current gen participants whose social information was "someone chose blue"
		b = sum(chose_blue)

		# count the generation size and check it liens up with the exp
		n = exp.generation_size
		assert n == len(chose_blue)

		return Response(json.dumps({"k":int(k), "n":int(n), "b":int(b), "button_order":button_orders[str(node_slot)], "node_utility":node_payout}), status=200, mimetype="application/json")

	try:
		return f(network_id = network_id, node_generation = node_generation, node_slot = node_slot)

	except Exception:
		db.logger.exception('Error fetching network info')
		return Response(status=403, mimetype='application/json')