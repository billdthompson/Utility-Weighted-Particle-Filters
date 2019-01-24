"""Replicate Rogers' paradox by simulating evolution with people."""

import random

from dallinger.experiment import Experiment
from dallinger.information import Meme
from dallinger.models import Network
from dallinger.models import Node
from dallinger.models import Participant
from dallinger.networks import DiscreteGenerational
from dallinger.nodes import Agent
from dallinger.nodes import Environment
from dallinger.nodes import Source


class RogersExperiment(Experiment):
    """The experiment class."""

    def __init__(self, session=None):
        """Call the same function in the super (see experiments.py in dallinger).

        The models module is imported here because it must be imported at
        runtime.

        A few properties are then overwritten.

        Finally, setup() is called.
        """
        super(RogersExperiment, self).__init__(session)
        from . import models
        self.models = models
        self.verbose = False
        self.experiment_repeats = 10
        self.practice_repeats = 0
        self.catch_repeats = 0  # a subset of experiment repeats
        self.practice_difficulty = 0.80
        self.difficulties = [0.525, 0.5625, 0.65] * self.experiment_repeats
        self.catch_difficulty = 0.80
        self.min_acceptable_performance = 10 / float(12)
        self.generation_size = 1
        self.generations = 4
        self.bonus_payment = 1.0
        self.initial_recruitment_size = self.generation_size

        if session and not self.networks():
            self.setup()
        self.save()

    @property
    def public_properties(self):
        return {
            'practice_repeats': self.practice_repeats,
            'experiment_repeats': self.experiment_repeats,
        }

    def assign_condition(self, network):
        return "conditione"

    def setup(self):
        """First time setup."""
        super(RogersExperiment, self).setup()

        for net in random.sample(self.networks(role="experiment"),
                                 self.catch_repeats):
            net.role = "catch"

        for net in self.networks():
            net.max_size = net.max_size + 1  # make room for environment node.
            env = self.models.RogersEnvironment(network=net)
            env.create_state(proportion=self.color_proportion_for_network(net))
            net.property1 = self.assign_condition(net)

    def color_proportion_for_network(self, net):
        if net.role == "practice":
            return self.practice_difficulty
        if net.role == "catch":
            return self.catch_difficulty
        if net.role == "experiment":
            return self.difficulties[self.networks(role="experiment").index(net)]

    def create_network(self):
        """Create a new network."""
        return DiscreteGenerational(
            generations=self.generations,
            generation_size=self.generation_size,
            initial_source=False
        )

    def create_node(self, network, participant):
        """Make a new node for participants."""
        return self.models.RogersAgent(network=network,participant=participant)

    def info_post_request(self, node, info):
        """Run whenever an info is created."""
        node.calculate_fitness()

    def submission_successful(self, participant):
        """Run when a participant submits successfully."""
        num_approved = len(Participant.query.filter_by(status="approved").all())
        current_generation = participant.nodes()[0].generation
        if num_approved % self.generation_size == 0 and current_generation % 10 == 0:
            for e in Environment.query.all():
                e.step()

    def recruit(self):
        """Recruit participants if necessary."""
        num_approved = len(Participant.query.filter_by(status="approved").all())
        end_of_generation = num_approved % self.generation_size == 0
        complete = num_approved >= (self.generations * self.generation_size)
        if complete:
            self.log("All networks full: closing recruitment", "-----")
            self.recruiter.close_recruitment()
        elif end_of_generation:
            self.log("generation finished, recruiting another")
            self.recruiter.recruit(n=self.generation_size)

    def bonus(self, participant):
        """Calculate a participants bonus."""
        nodes = participant.nodes()
        nets = Network.query.filter_by(role="experiment").all()
        net_ids = [net.id for net in nets]
        nodes = [node for node in nodes if node.network_id in net_ids]

        score = [node.score for node in nodes]
        average = float(sum(score)) / float(len(score))
        bonus = round(max(0.0, ((average - 0.5) * 2)) * self.bonus_payment, 2)
        return bonus

    def attention_check(self, participant=None):
        """Check a participant paid attention."""
        if self.catch_repeats == 0:
            return True

        nodes = participant.nodes()
        nets = Network.query.filter_by(role="catch").all()
        net_ids = [net.id for net in nets]
        nodes = [node for node in nodes if node.network_id in net_ids]

        scores = [n.score for n in nodes]
        avg = sum(scores) / float(len(scores))
        return avg >= self.min_acceptable_performance

    def data_check(self, participant):
        """Check a participants data."""
        nodes = Node.query.filter_by(participant_id=participant.id).all()

        if len(nodes) != self.experiment_repeats + self.practice_repeats:
            print("Error: Participant has {} nodes. Data check failed"
                  .format(len(nodes)))
            return False

        nets = [n.network_id for n in nodes]
        if len(nets) != len(set(nets)):
            print("Error: Participant participated in the same network \
                   multiple times. Data check failed")
            return False

        if None in [n.fitness for n in nodes]:
            print("Error: some of participants nodes are missing a fitness. \
                   Data check failed.")
            return False

        if None in [n.score for n in nodes]:
            print("Error: some of participants nodes are missing a score. \
                   Data check failed")
            return False
        return True

    def add_node_to_network(self, node, network):
        """Add participant's node to a network."""
        network.add_node(node)
        node.receive()

        environment = network.nodes(type=Environment)[0]
        environment.connect(whom=node)
        environment.transmit(to_whom=node)

        if node.generation > 0:
            agent_model = self.models.RogersAgent
            prev_agents = agent_model.query\
                .filter_by(failed=False,
                           network_id=network.id,
                           generation=node.generation - 1)\
                .all()
            parent = random.choice(prev_agents)
            parent.connect(whom=node)
            parent.transmit(what=Meme, to_whom=node)

        node.receive()
