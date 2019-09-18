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
from dallinger.models import Info, Network, Participant, Node
import pysnooper

class ParticleFilter(Network):
    """Discrete fixed size generations with random transmission"""

    __mapper_args__ = {"polymorphic_identity": "particlefilter"}

    def __init__(self, generations, generation_size, replication):
        """Endow the network with some persistent properties."""
        self.property1 = repr(generations)
        self.property2 = repr(generation_size)
        self.max_size = generations * generation_size + 1 # add one to account for initial_source
        self.replication = replication

    @property
    def generations(self):
        """The length of the network: the number of generations."""
        return int(self.property1)

    @property
    def generation_size(self):
        """The width of the network: the size of a single generation."""
        return int(self.property2)
    
    @hybrid_property
    def replication(self):
        """Make property3 replication."""
        return int(self.property3)

    @replication.setter
    def replication(self, replication):
        """Make replication settable."""
        self.property3 = repr(replication)

    @replication.expression
    def replication(self):
        """Make replication queryable."""
        return cast(self.property3, Integer)

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

    #@pysnooper.snoop()
    def add_node(self, node):
        curr_generation = NetworkRandomAttributes.query.filter_by(network_id = self.id).one().current_generation
        
        node.generation = curr_generation

        if curr_generation == 0:
            parent = self._select_oldest_source()
            if parent is not None:
                parent.connect(whom=node)
                parent.transmit(to_whom=node)

    def _select_oldest_source(self):
        return min(self.nodes(type=Environment), key=attrgetter("creation_time"))

    def _sample_previous_generation(self, node_type, generation):
        previous_generation = node_type.query.filter_by(failed=False, network_id=self.id, generation=(generation)).all()
        return random.choice(previous_generation)

class Particle(Node):
    """The Rogers Agent."""

    __mapper_args__ = {"polymorphic_identity": "particle"}

    @hybrid_property
    def slot(self):
        """Convert property1 to genertion."""
        return int(self.property1)

    @slot.setter
    def slot(self, slot):
        """Make slot settable."""
        self.property1 = repr(slot)

    @slot.expression
    def slot(self):
        """Make slot queryable."""
        return cast(self.property1, Integer)

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


    def __init__(self, contents=None, details = None, network = None, participant = None, slot = None):
        super(Particle, self).__init__(network, participant)
        self.condition = self.network.property5
        self.slot = slot
        # self.proportion = self.network.proportion

class OverFlow(Network):
    """An empty network with no vectors."""

    @declared_attr
    def __mapper_args__(cls):
        """The name of the source is derived from its class name."""
        return {
            "polymorphic_identity": cls.__name__.lower()
        }

    def __init__(self, generations, generation_size, replication):
        """Endow the network with some persistent properties."""
        self.property1 = repr(generations)
        self.property2 = repr(generation_size)
        # overflow network size is dynamic. It's minimum is generation_size. This may grow over the experiment
        self.max_size = generation_size + 1 # add one to account for initial_source
        self.replication = replication

    @property
    def generations(self):
        """The length of the network: the number of generations."""
        return int(self.property1)

    @property
    def generation_size(self):
        """The width of the network: the size of a single generation."""
        return int(self.property2)
    
    @hybrid_property
    def replication(self):
        """Make property3 replication."""
        return int(self.property3)

    @replication.setter
    def replication(self, replication):
        """Make replication settable."""
        self.property3 = repr(replication)

    @replication.expression
    def replication(self):
        """Make replication queryable."""
        return cast(self.property3, Integer)

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

    #@pysnooper.snoop()
    def add_node(self, node):

        arbitrary_network = ParticleFilter.query.first()

        curr_generation = NetworkRandomAttributes.query.filter_by(network_id = arbitrary_network.id).one().current_generation
        
        node.generation = curr_generation

        if curr_generation == 0:
            parent = self._select_oldest_source()
            if parent is not None:
                parent.connect(whom=node)
                parent.transmit(to_whom=node)

    def _select_oldest_source(self):
        return min(self.nodes(type=Environment), key=attrgetter("creation_time"))

class OverflowParticle(Node):
    """The Rogers Agent."""

    __mapper_args__ = {"polymorphic_identity": "overflowparticle"}

    @hybrid_property
    def slot(self):
        """Convert property1 to genertion."""
        return int(self.property1)

    @slot.setter
    def slot(self, slot):
        """Make slot settable."""
        self.property1 = repr(slot)

    @slot.expression
    def slot(self):
        """Make slot queryable."""
        return cast(self.property1, Integer)

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


    def __init__(self, contents=None, details = None, network = None, participant = None, slot = None):
        super(OverflowParticle, self).__init__(network, participant)
        self.condition = self.network.property5
        self.slot = slot
        # self.proportion = self.network.proportion

class NetworkRandomAttributes(Node):
    """The participant."""

    @declared_attr
    def __mapper_args__(cls):
        """The name of the source is derived from its class name."""
        return {
            "polymorphic_identity": cls.__name__.lower()
        }
   
    @hybrid_property
    def current_generation(self):
        """Convert property2 to genertion."""
        return int(self.property2)

    @current_generation.setter
    def current_generation(self, current_generation):
        """Make current_generation settable."""
        self.property2 = repr(current_generation)

    @current_generation.expression
    def current_generation(self):
        """Make current_generation queryable."""
        return cast(self.property2, Integer)

    # #@pysnooper.snoop()
    def sample_parents(self):
        N = self.network.generations
        n = self.network.generation_size
        parents = {}
        for g in range(1, N):
            parents[g] = dict(zip(list(range(n)), random.choices(list(range(n)), k = n)))
        return parents

    def sample_payout_colors(self):
        n = float(self.network.generation_size)
        return dict(zip(range(int(n)), (["green"] * int(n / 2.)) + (["blue"] * int(n / 2.))))

    def sample_button_order(self):
        n = float(self.network.generation_size)
        # uncomment below for real exp; commented so no need to run four per gen
        return dict(zip(range(int(n)), (["left"] * int(n / 4.)) + (["right"] * int(n / 4.)) + (["left"] * int(n / 4.)) + (["right"] * int(n / 4.))))
        # return dict(zip(range(int(n)), (["left"] * int(n / 2.)) + (["right"] * int(n / 2.))))

    def __init__(self, network, details = None):
        super(NetworkRandomAttributes, self).__init__(network)
        self.details = json.dumps({"parentschedule": self.sample_parents(), "payout_color": self.sample_payout_colors(), "button_order": self.sample_button_order()})
        self.current_generation = 0

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
        self.bonus = json.loads(contents)["current_bonus"]

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
        return all([q == "1" for q in self.questions.values()])

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

    @hybrid_property
    def proportion(self):
        """Make property5 proportion."""
        return float(self.property5)

    @proportion.setter
    def proportion(self, proportion):
        """Make proportion settable."""
        self.property5 = repr(proportion)

    @proportion.expression
    def proportion(self):
        """Make proportion queryable."""
        return cast(self.property5, Float)

    def create_state(self, proportion):
        """Create an environmental state."""
        self.proportion = proportion
        State(origin=self, contents=proportion)



class BiasReport(Meme):

    @declared_attr
    def __mapper_args__(cls):
        """The name of the source is derived from its class name."""
        return {
            "polymorphic_identity": cls.__name__.lower()
        }




