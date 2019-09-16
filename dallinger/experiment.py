from dallinger.experiment import Experiment
from dallinger.information import Meme
from dallinger.models import Network, Node, Participant
from dallinger.config import get_config
from sqlalchemy import and_, not_, func
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
	"""Utility Weighted Particle Filter with People.
	 
	 TODO: 
	 - debug multiple replications ofoverflow conditions
	 - ensure overflow conditions are handed out randomly
	 - snoop on data_check to see why "real" participants are failing at the end of a generation
	"""

	@property
	def public_properties(self):
		return {
		'generation_size':2, 
		'generations': 1,
		'planned_overflow':2,
		'num_replications_per_condition':1,
		'num_fixed_order_experimental_networks_per_experiment': 0,
		'num_random_order_experimental_networks_per_experiment': 2,
		'num_practice_networks_per_experiment': 2,
		'cover_story': 'true',
		'payout_blue':'true',
		'bonus_max': 1,
		}

	def __init__(self, session=None):
		super(UWPFWP, self).__init__(session)
		import models
		self.models = models
		self.set_known_classes()
		
		# These variables are potentially needed on every invocation 
		self.set_params()

		# setup is only needed when launching the experiment 
		if session and not self.networks():
			self.setup()
		self.save()

	def set_known_classes(self):
		self.known_classes["trialbonus"] = self.models.TrialBonus
		self.known_classes["biasReport"] = self.models.BiasReport
		self.known_classes["particle"] = self.models.Particle
		self.known_classes['comprehensiontest'] = self.models.ComprehensionTest
		self.known_classes['generativemodel'] = self.models.GenerativeModel
		self.known_classes["particlefilter"] = self.models.ParticleFilter
		self.known_classes["networkrandomattributes"] = self.models.NetworkRandomAttributes

	def set_params(self):
		"""
		Notes:
		- A condition is a manipulation
		- An experiment is a single replication of a condition
		- Information does not flow between experiments
		- A network is a single "Trial", with a constant proportion but generation-verying stimulus realisations of that proportion
		- Every experiment includes some practice networks and some experimental networks (fixed order and random order)

		Conditions:
		- SOC:N-U
		- SOC:W-U
		- ASO:N-U
		- ASO:W-U
		- SWI:N-U this one doesn't exist
		- SWU:W-U original utility information
		- SWB:W-U bias index
		- SWT:W-U truth index

		"""

		# Public Parameters
		for key, value in self.public_properties.items():
			setattr(self, key, value)

		# Internal parameters
		self.practice_network_proportions = [.65, .46, .35, .54] if not DEBUG else [.9,0.4]
		self.fixed_order_experimental_network_proportions = []
		self.random_order_experimental_network_proportions = [.49] * int(float(self.num_random_order_experimental_networks_per_experiment) / 2.) + [.51] * int(float(self.num_random_order_experimental_networks_per_experiment) / 2.)
		assert len(self.practice_network_proportions) == self.num_practice_networks_per_experiment
		assert len(self.fixed_order_experimental_network_proportions) == self.num_fixed_order_experimental_networks_per_experiment
		assert len(self.random_order_experimental_network_proportions) == self.num_random_order_experimental_networks_per_experiment

		self.condition_counts = {"SOC:W-U":self.num_replications_per_condition}

		# Derrived Quantities
		self.num_experiments = sum(self.condition_counts.values())
		self.num_experimental_participants_per_generation = self.generation_size * self.num_experiments
		self.num_experimental_networks_per_experiment = self.num_fixed_order_experimental_networks_per_experiment + self.num_random_order_experimental_networks_per_experiment
		self.num_networks_per_participant = self.num_practice_networks_per_experiment + self.num_experimental_networks_per_experiment
		self.num_experimental_networks_total = (self.num_practice_networks_per_experiment + self.num_experimental_networks_per_experiment) * self.num_experiments
		
		self.initial_recruitment_size = self.num_experimental_participants_per_generation + self.planned_overflow
		self.num_experimental_participants_per_generation = self.num_experiments * self.generation_size
		self.num_experimental_nodes_per_generation = self.num_experimental_networks_total * self.generation_size

	def create_network(self, condition, replication, role, decision_index, proportion):
		# identify entwork type: overflow?
		network_type = self.models.ParticleFilter
		
		# build network and add to session
		net = network_type(generations=self.generations, generation_size=self.generation_size, replication=replication, condition=condition, decision_index=decision_index, role=role)
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
					self.models.NetworkRandomAttributes(network = network, generations=self.generations, overflow_pool = self.planned_overflow)
					
				for f in range(self.num_fixed_order_experimental_networks_per_experiment):
					decision_index = self.num_practice_networks_per_experiment + f
					network = self.create_network(condition = condition, replication = replication, role = 'experiment', decision_index = decision_index, proportion = self.fixed_order_experimental_network_proportions[f])
					self.models.NetworkRandomAttributes(network = network, generations=self.generations, overflow_pool = self.planned_overflow)

				for r in range(self.num_random_order_experimental_networks_per_experiment):
					decision_index = self.num_practice_networks_per_experiment + self.num_fixed_order_experimental_networks_per_experiment + r
					network = self.create_network(condition = condition, replication = replication, role = 'experiment', decision_index = decision_index, proportion = self.random_order_experimental_network_proportions[r])
					self.models.NetworkRandomAttributes(network = network, generations=self.generations, overflow_pool = self.planned_overflow)
		
		self.session.commit()

	def network_occupancy_counts(self):
		"""How many participants are already working or have completed working in each network?"""

		arbitrary_network = self.models.ParticleFilter.query.filter_by(failed = False, full = False).first()

		if not arbitrary_network:
			return []

		current_generation = arbitrary_network.current_generation

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
			return self.models.Network.query.filter(and_(self.models.Network.property4 == repr(completed_decisions), self.models.Network.property5 == participant_condition, self.models.Network.property3 == participant_replication)).one()

		# If it is time to sample a network at random
		else:
			# find networks which match the participant's condition and werent' fixed order nets
			matched_condition_experimental_networks = self.models.Network.query.filter(and_(cast(self.models.Network.property4, Integer) >= nfixed, self.models.Network.property5 == participant_condition, self.models.Network.property3 == participant_replication)).all()
			
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
				# return self.models.OverFlow.query.order_by(self.models.OverFlow.property4.asc()).first()
				return random.choice(self.models.ParticleFilter.query.filter_by(failed = False).filter(self.models.ParticleFilter.property4 == repr(0)).all())

		# Subset netowek counts down to only first trial networks
		network_counts = dict(filter(lambda count: count[0] in net_ids, network_counts))
		self.log("Network Counts: {}".format(network_counts), key)

		# Find networks that have some participants but are not full
		not_saturated = dict(filter(lambda count: count[1] < self.generation_size, network_counts.items()))
		self.log("These networks have some participants, but are not saturated: {}".format(not_saturated), key)

		# And networks that have no participants yet
		not_started = list(filter(lambda net_id: net_id not in network_counts.keys(), net_ids))
		self.log("These networks do not have any participants yet this generation: {}".format(not_started), key)

		# filter out any conditions who already have enough nodes in this generation
		availible_networks = [net for net in nets if net.id in (not_started + list(not_saturated.keys()))]

		if not availible_networks:
			self.log("All experimental networks currently are at capacity. Assigning participant to a random network.", key)
			# return self.models.OverFlow.query.order_by(self.models.OverFlow.property4.asc()).first()
			return random.choice(self.models.ParticleFilter.query.filter_by(failed = False).filter(self.models.ParticleFilter.property4 == repr(0)).all())

		self.log("The availible networks are: {}".format([net.id for net in availible_networks]), key)
		return random.choice(availible_networks)

	# @pysnooper.snoop()
	def assign_slot(self, participant, network):
		key = "experiment.py >> assign_slot: "
		# estbalish current generation
		current_generation = network.current_generation

		all_nodes_this_network_this_generation_so_far =  self.models.Particle.query.filter(self.models.Particle.property2 == repr(int(current_generation)), not_(self.models.Particle.property5.contains("OVF"))).filter_by(network_id = network.id, failed = False).all()

		# which slots (1, ..., n) are already occupied?
		all_node_slots_already_taken = [existing_node.slot for existing_node in all_nodes_this_network_this_generation_so_far]

		# which slots remain availible for new nodes?
		node_slots_still_availible = [slot for slot in range(self.generation_size) if slot not in all_node_slots_already_taken]

		if not node_slots_still_availible:
			existing_overflow_nodes = self.models.Particle.query.filter(self.models.Particle.property2 == repr(int(current_generation)), self.models.Particle.property5.contains("OVF")).filter_by(network_id = network.id, failed = False).all()
			overflow_node_slots_already_taken = [overflow_node.slot for overflow_node in existing_overflow_nodes]
			availible_overflow_node_slots = [slot for slot in range(self.generation_size) if slot not in overflow_node_slots_already_taken]
			if not availible_overflow_node_slots:
				random_slot = random.choice(range(self.generation_size))
				self.log("No Epxerimental or Shadow slots availible for Participant {} in network {} [Cond: {}; Rep: {}]. Assigning slot {} at random.".format(participant.id, network.id, network.condition, network.replication, random_slot), key)
				return random_slot

			random_slot = random.choice(availible_overflow_node_slots)
			self.log("No Epxerimental slots availible for Participant {} in network {} [Cond: {}; Rep: {}]. Assigning Shadow slot {} at random (from {} availible).".format(participant.id, network.id, network.condition, network.replication, random_slot, len(availible_overflow_node_slots)), key)
			return random_slot
		
		random_slot = random.choice(node_slots_still_availible)
		self.log("{} Epxerimental slots remain availible for Participant {} in network {} [Cond: {}; Rep: {}]. Assigning slot {} at random.".format(len(node_slots_still_availible), participant.id, network.id, network.condition, network.replication, random_slot), key)
		return random_slot

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
			self.log("Assigned to network: {}; Condition: {}; Replication: {}; Decsion Index: {};".format(chosen_network.id, chosen_network.condition, chosen_network.replication, chosen_network.decision_index), key)

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
		return self.models.Particle(network=network,participant=participant, slot = slot)

	# @pysnooper.snoop()
	def add_node_to_network(self, node, network):
		"""Add participant's node to a network."""
		if isinstance(node, self.models.Particle):
			participant_nodes = list(filter(lambda n: n.id != node.id, self.models.Particle.query.filter_by(participant_id = node.participant_id, failed = False).all()))
			if participant_nodes:
				network.add_node(node, generation = participant_nodes[0].generation)
			else:
				network.add_node(node)

			node.proportion = float(self.models.GenerativeModel.query.filter_by(network_id = network.id).one().property5) # property5 = proportion
			node.decision_index = self.models.Particle.query.filter_by(participant_id=node.participant_id, failed = False, type = 'particle').count()
		
		else:
			network.add_node(node)

	def update_overflow_pool(self, this_generations_uptake):
		key = "experiment.py >> update_overflow_pool: "
		for network_random_atttributes in self.models.NetworkRandomAttributes.query.all():
			network_random_atttributes.overflow_pool = int(network_random_atttributes.overflow_pool) + this_generations_uptake
		self.log("Updated all overflow uptake statistics in NetworkRandomAttributes cache.", key)

	# @pysnooper.snoop(prefix = "@snoopsten: ")
	def overflow_uptake_count_this_generation(self):
		"""How many participants started working or have completed working this generation in each overflow replication?"""
		# property3 = decsion_nidex
		uptake = self.models.Particle.query.filter_by(failed = False).filter(self.models.Particle.property3 == repr(1)).count() - self.num_experimental_participants_per_generation
		self.update_overflow_pool(uptake)
		return uptake

	def overflow_uptake_count_total(self):
		# first_trial_networks = self.models.ParticleFilter.query.filter(self.models.ParticleFilter.property4 == repr(1)).filter_by(failed = False).all()
		# first_trial_network_ids = [net.id for net in first_trial_networks]
		# return (self.models.Particle.query.filter_by(failed = False)
		# 	.filter(and_(self.models.Particle.network_id.in_(first_trial_network_ids),
		# 	 			 self.models.Particle.property5.contains("OVF")))
		# 	.count())
		return int(self.models.NetworkRandomAttributes.query.first().overflow_pool)

	# @pysnooper.snoop(prefix = "@snoop: ")
	def calculate_required_overrecruitment(self):
		key = "experiment.py >> calculate_required_overrecruitment: "
		return min([self.planned_overflow, self.overflow_uptake_count_this_generation()])

	def rollover_generation(self):
		key ="experiment.py >> rollover_generation: "
		for net in self.networks():
			net.current_generation = int(net.current_generation) + 1
			nra = self.models.NetworkRandomAttributes.query.filter_by(network_id = net.id).one()
			nra.current_generation = int(nra.current_generation) + 1
		self.log("Rolled new generation: all networks now at generation: {}".format(int(net.current_generation)), key)

	@pysnooper.snoop()
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
		current_generation = arbitrary_network.current_generation

		# how many of this geenration's nodes have been approved?
		num_experimental_nodes_approved_this_generation = (
			self.models.Particle.query.filter_by(failed = False).filter(
			self.models.Particle.participant_id.in_(approved_participant_ids),
			self.models.Particle.property2 == repr(current_generation),
			not_(self.models.Particle.property5.contains("OVF")))
			.count()
		)

		# Is this generation complete?
		end_of_generation = num_experimental_nodes_approved_this_generation >= self.num_experimental_nodes_per_generation

		self.log("Generation in Progress: {}; Experimental nodes (particles) approved: {}; Required: {}".format(current_generation, num_experimental_nodes_approved_this_generation, self.num_experimental_nodes_per_generation), key)
		self.log("End of generation: {}".format(end_of_generation), key)

		# Are all experimental generations complete?
		experimental_networks_complete = (current_generation == self.generations - 1) & (end_of_generation)

		# Have we finished recruiting experimental paricipants?
		if experimental_networks_complete:
			# How many overflow nodes are required according to the recruitments that have been issued?
			total_overflow_participants_required = self.overflow_uptake_count_total()

			num_approved_overflow_participants = (self.models.Particle.query.filter_by(failed = False).filter(
				self.models.Particle.participant_id.in_(approved_participant_ids),
				self.models.Particle.property3 == repr(1),
				self.models.Particle.property5.contains("OVF"))
			.count())

			if num_approved_overflow_participants >= total_overflow_participants_required:
				self.log("All experimental networks are full. Overflow is full. Experiment complete: closing recruitment", key)
				self.recruiter.close_recruitment()

			else:
				self.log("All experimental networks are full. Overflow recruits remain live. Waiting on {} more overflow participants.".format(total_overflow_participants_required - num_approved_overflow_participants), key)
				return

		# Or are more generations required? 
		elif end_of_generation:
			next_generation_required_overflow = self.calculate_required_overrecruitment()
			self.log("Required over-recruiment at the next generation is: {}.".format(next_generation_required_overflow), key)

			# If we got here, it's time to roll out a new generation
			# change state
			self.log("Generation finished.", key)
			self.rollover_generation()
			self.recruiter.recruit(n = (self.generation_size * (self.num_experiments)) + next_generation_required_overflow)

	# @pysnooper.snoop()
	def submission_successful(self, participant):
		key = "experiment.py >> submission_successful: "
		nodes = participant.nodes()
		if not nodes:
			self.log("Participant {} submitted sucessfully but created no nodes.".format(participant.id), key)
			return
		
		approved_participants = self.models.Participant.query.filter_by(status="approved", failed = False).all()
		approved_participant_ids = [p.id for p in approved_participants if p.id != participant.id]

		network_ids = [node.network_id for node in nodes]
		approved_nodes = (self.models.Particle.query.filter(and_(
			self.models.Particle.network_id.in_(network_ids),
			not_(self.models.Particle.property5.contains("OVF")),
			self.models.Particle.property2 == repr(nodes[0].generation),
			self.models.Particle.participant_id.in_(approved_participant_ids)))
		.count())
		
		if approved_nodes >= self.generation_size * self.num_networks_per_participant:
			for node in nodes:
				node.condition = node.condition + "-OVF"
			self.log("Participant {} [Gen: {}; Cond: {}] has been assigned status: Overflow".format(participant.id, nodes[0].generation, nodes[0].condition), key)
			return

		self.log("Participant {} [Gen: {}; Cond: {}] has been assigned status: Experimental".format(participant.id, nodes[0].generation, nodes[0].condition), key)

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
		key = "experiment.py >> data_check: "
		infos = participant.infos()

		if not infos:
			return False
		
		passed =  np.any([info.passed for info in infos if info.type == 'comprehensiontest'])

		if not passed:
			self.log("Participant {} failed".format(participant.id), key)

		return passed

	# @pysnooper.snoop()
	def data_check(self, participant):
		"""Check a participants data."""
		key = "experiment.py >> data_check: "
		nodes = Node.query.filter_by(participant_id=participant.id).all()

		if not nodes:
			return False

		self.log("Node type {} submitted".format(nodes[0].type), key)

		if len(nodes) != self.num_practice_networks_per_experiment + self.num_experimental_networks_per_experiment:
			self.log("Error: self.models.Participant has {} nodes. Data check failed"
				  .format(len(nodes)), key)
			return False

		nets = [n.network_id for n in nodes]
		if len(nets) != len(set(nets)):
			self.log("Error: self.models.Participant participated in the same network \
				   multiple times. Data check failed", key)
			return False

		return True

	def is_complete(self):
		required_participants = (self.generations * self.generation_size * sum(self.condition_counts.values())) + int(self.models.NetworkRandomAttributes.query.first().overflow_pool)
		completed_participants = self.models.Participant.query.filter_by(status="approved", failed = False).count()
		return completed_participants >= required_participants

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

		return Response(json.dumps({"network":{"property4":net.__json__()["property4"],"property5": net.__json__()["property5"], "property3": net.__json__()["property3"]}}), status=200, mimetype="application/json")

	except Exception:
		db.logger.exception('Error fetching network info')
		return Response(status=403, mimetype='application/json')

@extra_routes.route("/random_attributes/<int:network_id>/<int:node_generation>/<int:node_slot>", methods=["GET"])
# @pysnooper.snoop()
def get_random_atttributes(network_id, node_generation, node_slot):
	# logger.info("--->>> generation: {}, {}".format(generation, type(generation)))

	exp = UWPFWP(db.session)

	# get the network for this id
	net = exp.getnet(network_id)

	# if we're at generation zero, just get color payout and button order
	if (node_generation == 0):

		# grab the attributes for this netowrk
		network_attributes = exp.models.NetworkRandomAttributes.query.filter_by(network_id = network_id).one()

		# load detils
		data = json.loads(network_attributes.details)

		payout_colors, button_orders = data["payout_color"], data["button_order"]

		# Whcih color is incentivised for this node?
		node_payout = payout_colors[str(node_slot)]

		# Button order randomisation
		node_button_order = button_orders[str(node_slot)]

		# practice + fixed + random
		# [.65, .46, .35, .54] // [.49, .51, .51, .49] // [.48, .52, .51, .49]
		# ks = [12, 5, 0, 7]  + [8, 12, 4, 0] + [12, 0, 4, 8]
		# assert exp.num_random_order_experimental_networks_per_experiment == 8
		# ks = [12, 5, 2, 9] + [2, 5, 7, 10] + [0,4,8,12]

		# n = 12

		# i = int(net.decision_index)

		# return Response(json.dumps({"k":ks[i], "n":12, "b":-1, "button_order":node_button_order, "node_utility":node_payout}), status=200, mimetype="application/json")
		
		return Response(json.dumps({"k":-1, "n":-1, "b":-1, "button_order":node_button_order, "node_utility":node_payout}), status=200, mimetype="application/json")

	@pysnooper.snoop()
	def f(network_id = None, node_slot = None, node_generation = None):

		# establish whether we're dealing with an overflow node or not
		node_type = exp.models.Particle

		# all approveed participnts
		approved_participants = exp.models.Participant.query.filter_by(status="approved", failed = False).all()

		# all approved participant ids
		approved_participant_ids = [p.id for p in approved_participants]

		previous_generation_nodes = (node_type.query.filter_by(failed = False, network_id = net.id).filter(and_(
			node_type.property2 == repr(int(node_generation) - 1),
			not_(node_type.property5.contains("OVF")),
			node_type.participant_id.in_(approved_participant_ids)))
		.all())

		# grab the attributes for this netowrk
		network_attributes = exp.models.NetworkRandomAttributes.query.filter_by(network_id = network_id).one()

		# load detils
		data = json.loads(network_attributes.details)

		# isolate the three data fields
		parentschedule, payout_colors, button_orders = data["parentschedule"][str(node_generation)], data["payout_color"], data["button_order"]

		# estblish the incentivised colors for this node
		node_payout = payout_colors[str(node_slot)]

		previous_generation_memes = np.array([node.infos(type = Meme)[0] for node in previous_generation_nodes if node.infos(type = Meme)])

		previous_generation_memes_contents = np.array([json.loads(node.infos(type = Meme)[0].contents) for node in previous_generation_nodes if node.infos(type = Meme)])

		previous_generation_choices = np.array([json.loads(node.infos(type = Meme)[0].contents)["choice"] for node in previous_generation_nodes if node.infos(type = Meme)])

		previous_generation_utilities = np.array([payout_colors[str(node.slot)] for node in previous_generation_nodes if node.infos(type = Meme)])
		
		# make a list of whether each parent node chose blue or not
		chose_blue = previous_generation_choices == "blue"

		# count how many parents selected their incentivised color
		# k = (previous_generation_choices == previous_generation_utilities).sum()
		k = sum(np.array([json.loads(node.infos(type = Meme)[0].contents)["choice"] == payout_colors[str(node.slot)] for node in previous_generation_nodes if node.infos(type = Meme)]))

		# count the number who did choose blue
		# this is the nunmbr of current gen participants whose social information was "someone chose blue"
		# b = sum(chose_blue)
		b = sum(np.array([json.loads(node.infos(type = Meme)[0].contents)["choice"] == "blue" for node in previous_generation_nodes if node.infos(type = Meme)]))

		# count the generation size and check it liens up with the exp
		n = exp.generation_size
		assert n == len(chose_blue)

		return Response(json.dumps({"k":int(k), "n":int(n), "b":int(b), "button_order":button_orders[str(node_slot)], "node_utility":node_payout}), status=200, mimetype="application/json")

	try:
		return f(network_id = network_id, node_generation = node_generation, node_slot = node_slot)

	except Exception:
		db.logger.exception('Error fetching network info')
		return Response(status=403, mimetype='application/json')