from operator import attrgetter
import random
import json

import logging
logger = logging.getLogger(__file__)

from sqlalchemy import Float, Integer, String
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.sql.expression import cast
from sqlalchemy.ext.declarative import declared_attr

from dallinger import transformations
from dallinger.information import Gene, Meme, State
from dallinger.nodes import Agent, Environment, Source
from dallinger.models import Info, Network

class ParticleFilter(Network):
    """Discrete fixed size generations with random transmission"""

    __mapper_args__ = {"polymorphic_identity": "particlefilter"}

    def __init__(self, generations, generation_size, initial_source):
        """Endow the network with some persistent properties."""
        self.property1 = repr(generations)
        self.property2 = repr(generation_size)
        self.property3 = repr(initial_source)
        if self.initial_source:
            self.max_size = generations * generation_size + 1
        else:
            self.max_size = generations * generation_size

    @property
    def generations(self):
        """The length of the network: the number of generations."""
        return int(self.property1)

    @property
    def generation_size(self):
        """The width of the network: the size of a single generation."""
        return int(self.property2)

    @property
    def initial_source(self):
        """The source that seeds the first generation."""
        return self.property3.lower() != "false"

    @hybrid_property
    def decision_index(self):
        """Make property4 decision_index."""
        return int(self.property4)

    @decision_index.setter
    def decision_index(self, decision_index):
        """Make decision_index settable."""
        self.property4 = repr(decision_index)

    @decision_index.expression
    def decision_index(self):
        """Make decision_index queryable."""
        return cast(self.property4, Integer)

    @hybrid_property
    def condition(self):
        """Make property5 condition."""
        return self.property5

    @condition.setter
    def condition(self, condition):
        """Make condition settable."""
        self.property5 = condition

    @condition.expression
    def condition(cls):
        """Make condition queryable."""
        return cls.property5

    def add_node(self, node):
        """Link to the agent from a parent based on the parent's fitness"""
        num_agents = len(self.nodes(type=Agent))
        
        curr_generation = int((num_agents - 1) / float(self.generation_size))
        
        node.generation = curr_generation

        # logger.info("--->>> add_node gen: {}".format(curr_generation))

        if curr_generation == 0 and self.initial_source:
            parent = self._select_oldest_source()
        else:
            parent = self._sample_previous_generation(node_type=type(node), generation=curr_generation - 1)

        if parent is not None:
            parent.connect(whom=node)
            parent.transmit(to_whom=node)

    def _select_oldest_source(self):
        logger.info("--->>> createnet nodes: {}".format(self.nodes()))
        return min(self.nodes(type=Environment), key=attrgetter("creation_time"))

    def _sample_previous_generation(self, node_type, generation):
        logger.info("--->>> gen: {}".format(generation))
        previous_generation = node_type.query.filter_by(failed=False, network_id=self.id, generation=(generation)).all()
        return random.choice(previous_generation)

class Particle(Agent):
    """The Rogers Agent."""

    __mapper_args__ = {"polymorphic_identity": "rogers_agent"}

    @hybrid_property
    def role(self):
        """Convert property1 to genertion."""
        return str(self.property1)

    @role.setter
    def role(self, role):
        """Make role settable."""
        self.property1 = repr(role)

    @role.expression
    def role(self):
        """Make role queryable."""
        return cast(self.property1, str)

    @hybrid_property
    def generation(self):
        """Convert property2 to genertion."""
        return int(self.property2)

    @generation.setter
    def generation(self, generation):
        """Make generation settable."""
        self.property2 = repr(generation)

    @generation.expression
    def generation(self):
        """Make generation queryable."""
        return cast(self.property2, Integer)

    @hybrid_property
    def decision_index(self):
        """Convert property3 to decision_index."""
        return int(self.property3)

    @decision_index.setter
    def decision_index(self, decision_index):
        """Mark decision_index settable."""
        self.property3 = repr(decision_index)

    @decision_index.expression
    def decision_index(self):
        """Make decision_index queryable."""
        return cast(self.property3, Integer)

    @hybrid_property
    def proportion(self):
        """Make property4 proportion."""
        return float(self.property4)

    @proportion.setter
    def proportion(self, proportion):
        """Make proportion settable."""
        self.property4 = repr(proportion)

    @proportion.expression
    def proportion(self):
        """Make proportion queryable."""
        return cast(self.property4, Float)

    @hybrid_property
    def condition(self):
        """Make property5 condition."""
        return self.property5

    @condition.setter
    def condition(self, condition):
        """Make condition settable."""
        self.property5 = condition

    @condition.expression
    def condition(cls):
        """Make condition queryable."""
        return cls.property5


    def __init__(self, contents=None, details = None, network = None, participant = None):
        super(Particle, self).__init__(network, participant)
        self.condition = self.network.property5
        self.role = self.network.role
        self.decision_index = self.network.decision_index
        # self.proportion = self.network.proportion

class TrialBonus(Info):
    """An Info that represents a parametrisable technology with a utility function."""

    @declared_attr
    def __mapper_args__(cls):
        """The name of the source is derived from its class name."""
        return {
            "polymorphic_identity": cls.__name__.lower()
        }

    @hybrid_property
    def bonus(self):
        """Use property1 to store the bonus."""
        try:
            return float(self.property1)
        except TypeError:
            return None

    @bonus.setter
    def bonus(self, bonus):
        """Assign bonus to property1."""
        self.property1 = float(bonus)

    @bonus.expression
    def bonus(self):
        """Retrieve bonus via property1."""
        return cast(self.property1, float)

    def parse_data(self, contents):
        self.bonus = json.loads(contents)["bonus"]

    def __init__(self, origin, contents=None, details = None, initialparametrisation = None):
        self.origin = origin
        self.origin_id = origin.id
        self.network_id = origin.network_id
        self.network = origin.network
        self.parse_data(contents)


class ComprehensionTest(Info):
    """An Info that represents a comprehension test."""

    @declared_attr
    def __mapper_args__(cls):
        """The name of the source is derived from its class name."""
        return {
            "polymorphic_identity": cls.__name__.lower()
        }

    @hybrid_property
    def passed(self):
        """Use property1 to store the technology's parameters and their ranges as a json string."""
        try:
            return bool(self.property1)
        except TypeError:
            return None

    @passed.setter
    def passed(self, p):
        """Assign passed to property1."""
        self.property1 = p

    @passed.expression
    def passed(self):
        """Retrieve passed via property1."""
        return cast(self.property1, bool)

    def evaluate_answers(self):

        return (self.questions["q1"] == "10") &\
        (self.questions["q2"] == "9")

    def __init__(self, origin, contents=None, details = None, initialparametrisation = None):
        self.origin = origin
        self.origin_id = origin.id
        self.network_id = origin.network_id
        self.network = origin.network
        self.questions = json.loads(contents)
        self.passed = self.evaluate_answers()
        self.contents = contents



class GenerativeModel(Environment):
    """The Data-generating Environment."""
    
    @declared_attr
    def __mapper_args__(cls):
        """The name of the source is derived from its class name."""
        return {
            "polymorphic_identity": cls.__name__.lower()
        }

    def create_state(self, proportion):
        """Create an environmental state."""
        State(origin=self, contents=proportion)
