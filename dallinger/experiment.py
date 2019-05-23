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

import numpy as np
import random
import json
import pandas as pd

import logging
logger = logging.getLogger(__file__)

class UWPFWP(Experiment):
	"""Utility Weighted Particle Filter with People."""

	@property
	def public_properties(self):
		return {
		'generation_size': 3, 
		'generations': 3, 
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
		
		# These variables are potentially needed on every invocation 
		self.set_params()
		self.set_known_classes()
		self.assign_proportions_to_networks()

		# These variables are only needed when launching the experiment 
		if session and not self.networks():
			self.setup()
		self.save()

	def set_known_classes(self):
		self.known_classes["trialbonus"] = self.models.TrialBonus
		self.known_classes["particlefilter"] = self.models.ParticleFilter
		self.known_classes["particle"] = self.models.Particle
		self.known_classes['comprehensiontest'] = self.models.ComprehensionTest
		self.known_classes['generativemodel'] = self.models.GenerativeModel

	def set_params(self):
		self.condition_names = {0:"asocial", 1:"social", 2:"social_with_info"}
		self.nconditions = len(self.condition_names)
		self.generation_size = self.public_properties['generation_size']
		self.generations = self.public_properties['generations']
		self.num_fixed_order_experimental_networks_per_condition = self.public_properties['num_fixed_order_experimental_networks_per_condition']
		self.num_random_order_experimental_networks_per_condition = self.public_properties['num_random_order_experimental_networks_per_condition']
		self.num_experimental_networks_per_condition = self.experimental_decisions = self.num_fixed_order_experimental_networks_per_condition + self.num_random_order_experimental_networks_per_condition
		self.num_practice_networks_per_condition = self.practice_decisions = self.public_properties['num_practice_networks_per_condition']
		self.number_of_networks = (self.num_practice_networks_per_condition + self.num_experimental_networks_per_condition) * self.nconditions
		self.initial_recruitment_size = self.nconditions * self.generation_size
		self.min_acceptable_performance = 10 / float(12)    
		self.bonus_payment = 1.0
		self.bonus_max = 4.3

	def assign_conditions_to_networks(self):
		self.conditions = list(self.condition_names.values()) * (self.num_practice_networks_per_condition + self.num_experimental_networks_per_condition)

	def assign_proportions_to_networks(self):
		# proprtions for practice networks
		self.practice_network_proportions = [.47, .53, .51, .48]
		
		# proprtions for experimental networks (fixed order and random order)
		self.fixed_order_experimental_network_proportions = [.48, .52, .51, .49]
		self.random_order_experimental_network_proportions = [.48, .52, .51, .49]

		# checlk the proportions match the number of networks in total
		ntrials = len(self.practice_network_proportions) + len(self.fixed_order_experimental_network_proportions) + len(self.random_order_experimental_network_proportions)
		
		self.log("{};{};{}".format(ntrials, self.num_practice_networks_per_condition, self.num_experimental_networks_per_condition), '---->')
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
		
		self.assign_conditions_to_networks()
		self.assign_decision_indices_to_networks()
		self.assign_roles_to_networks()

		df = pd.DataFrame(dict(roles = self.roles, conditions = self.conditions, decision_indices = self.decision_indices, network_proportions = self.network_proportions))

		logging.info("-->> data:\n{}".format(df.sort_values(['conditions', 'decision_indices', 'roles', 'network_proportions'])))
		
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

	def get_network_for_participant(self, participant):
		"""Find a network for a participant."""
		key = "--->> Participant: {}".format(participant.id)

		# Grab all the nodes previously created by this participant
		participant_nodes = Node.query.filter_by(participant_id=participant.id).all()

		if not participant_nodes:
			nets = Network.query.filter(Network.property4 == repr(0)).filter_by(full = False).all() # network.property4 = condtion
			return random.choice(nets)

		# What condition is this participant in?
		self.log("--->> participant nodes: {}".format(participant_nodes))
		participant_condition = participant_nodes[0].property5 # node.property5 = condition

		self.log('--->>> completed desicions, nets: {}'.format(type(participant_condition)))

		# which networks has this participant already completed?
		networks_participated_in = [node.network_id for node in participant_nodes]
		
		# How many decisions has the particiapnt already made?
		completed_decisions = len(networks_participated_in)

		if completed_decisions == self.num_practice_networks_per_condition + self.num_experimental_networks_per_condition:
			return None

		nfixed = self.num_practice_networks_per_condition + self.num_fixed_order_experimental_networks_per_condition

		# If the participant must still follow the fixed network order
		if completed_decisions < nfixed:
			nets = Network.query.filter(and_(Network.property4 == repr(completed_decisions), Network.property5 == participant_condition)).filter_by(full = False).all()
			

			chosen_network = random.choice(nets)

		# If it is time to sample a network at random
		else:
			# find networks which match the participant's condition and werent' fixed order nets
			matched_condition_experimental_networks = Network.query.filter(and_(cast(Network.property4, Integer) >= nfixed, Network.property5 == participant_condition)).filter_by(full = False).all()
			
			# subset further to networks not already participated in (because here decision index doesnt guide use)
			availible_options =  [net for net in matched_condition_experimental_networks if net.id not in networks_participated_in]
			
			# choose randomly among this set
			chosen_network = random.choice(availible_options)

		return chosen_network


	def create_node(self, network, participant):
		"""Make a new node for participants."""
		if len([i for i in participant.infos() if i.type == "meme"]) >= (self.practice_decisions + self.experimental_decisions):
			raise Exception
		
		return self.models.Particle(network=network,participant=participant)

	def add_node_to_network(self, node, network):
		"""Add participant's node to a network."""
		network.add_node(node)
		node.receive()

		if isinstance(node, self.models.Particle):
			node.proportion = self.proportion_schedule[network.decision_index]
			
			# keep track of how which order the participant is doing neteworks
			completed_decisions = self.models.Particle.query.filter_by(participant_id=node.participant_id, failed = False, type = 'particle').count()
			node.decision_index = completed_decisions + 1

		datasource = network.nodes(type=Environment)[0]
		datasource.connect(whom=node)
		datasource.transmit(to_whom=node)

		if node.generation > 0:
			agent_model = self.models.Particle
			prev_agents = agent_model.query\
				.filter_by(failed=False,
						   network_id=network.id,
						   generation=node.generation - 1)\
				.all()
			parent = random.choice(prev_agents)
			parent.connect(whom=node)
			parent.transmit(what=Meme, to_whom=node)

		node.receive()

	def recruit(self):
		"""Recruit participants if necessary."""
		num_approved = len(Participant.query.filter_by(status="approved").all())
		end_of_generation = num_approved % (self.generation_size * self.nconditions) == 0
		complete = num_approved >= (self.generations * self.generation_size * self.nconditions)
		if complete:
			self.log("All networks full: closing recruitment", "-----")
			self.recruiter.close_recruitment()
		elif end_of_generation:
			self.log("generation finished, recruiting another")
			self.recruiter.recruit(n=self.generation_size)

	def bonus(self, participant):
		"""Calculate a participants bonus."""
		infos = participant.infos()
		totalbonus = sum([float(info.property1) for info in infos if info.type == "trialbonus"])
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
		
		return np.any([info.passed for info in infos if info.type == 'comprehensiontest'])

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