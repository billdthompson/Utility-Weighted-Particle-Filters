from operator import attrgetter
import sys
import random
import json
import numpy as np

import logging
logger = logging.getLogger(__file__)

from sqlalchemy import Float, Integer, String
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.sql.expression import cast
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy import and_, not_, func

from dallinger import transformations
from dallinger.information import Gene, Meme, State
from dallinger.nodes import Agent, Environment, Source
from dallinger.models import Info, Network, Participant, Node
from dallinger import db
import pysnooper

class ParticleFilter(Network):
    """Discrete fixed size generations with random transmission"""

    __mapper_args__ = {"polymorphic_identity": "particlefilter"}

    def __init__(self, generation_size, generations, replication, condition, decision_index, role):
        """Endow the network with some persistent properties."""
        self.current_generation = 0
        self.generation_size = generation_size
        self.max_size = generations * generation_size + 2 # add one to account for initial_source; one for random_attributes
        self.replication = replication
        self.condition = condition
        self.decision_index = decision_index
        self.role = role
        self.set_randomisation()
    
    @hybrid_property
    def current_generation(self):
        """Make property1 current_generation."""
        return int(self.property1)

    @current_generation.setter
    def current_generation(self, current_generation):
        """Make current_generation settable."""
        self.property1 = repr(current_generation)

    @current_generation.expression
    def current_generation(self):
        """Make current_generation queryable."""
        return cast(self.property1, Integer)

    @hybrid_property
    def generation_size(self):
        """Make property2 generation_size."""
        return int(self.property2)

    @generation_size.setter
    def generation_size(self, generation_size):
        """Make generation_size settable."""
        self.property2 = repr(generation_size)

    @generation_size.expression
    def generation_size(self):
        """Make generation_size queryable."""
        return cast(self.property2, Integer)
    
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

    def log(self, text, key="?????"):
        """Print a string to the logs."""
        print(">>>> {} {}".format(key, text))
        sys.stdout.flush()

    def set_randomisation(self):
        n = float(self.generation_size)
        self.payout_colours = dict(zip(range(int(n)), (["left"] * int(n / 2.)) + (["right"] * int(n / 2.))))
        self.button_orders = dict(zip(range(int(n)), (["left"] * int(n / 2.)) + (["right"] * int(n / 2.))))

    def assigned_slots(self, generation):
        """Returns all slots that have been *provisionally asigned* @ generation"""
        query = (
            db.session.query(Particle).join(Participant)
            .filter(Particle.network_id == self.id)
            .filter(Particle.failed == False)
            .filter(Particle.property2 == repr(generation))
            .filter(not_(Particle.property5.contains("OVF")))
            )
        assigned_slots = query.all()
        return [int(node.property1) for node in assigned_slots]

    def assigned_shadow_slots(self, generation):
        """Returns all slots that have been *provisionally asigned to shadow participants* @ generation"""
        query = (
            db.session.query(Particle).join(Participant)
            .filter(Particle.network_id == self.id)
            .filter(Particle.failed == False)
            .filter(Particle.property2 == repr(generation))
            .filter(Particle.property5.contains("OVF"))
            )
        assigned_shadow_slots = query.all()
        return [int(node.property1) for node in assigned_shadow_slots]

    # @pysnooper.snoop()
    def full_slots(self, generation, ignore_id = None):
        """Returns all slots that have been *filled* @ generation"""

        query = (
            db.session.query(Particle).join(Participant)
            .filter(Particle.network_id == self.id)
            .filter(Participant.status == "approved")
            .filter(Particle.failed == False)
            .filter(Particle.property2 == repr(generation))
            .filter(not_(Particle.property5.contains("OVF")))
            )

        if ignore_id is not None:
            query = query.filter(Participant.id != ignore_id)

        full_slots = query.all()
        return [int(node.property1) for node in full_slots]
        
    def assign_slot(self, participant):
        key = "models.py >> assign_slot: "
        """Assign a *provisional* slot to a new participant """
        all_node_slots_already_taken = self.assigned_slots(self.current_generation)
        node_slots_still_availible = [slot for slot in range(self.generation_size) if slot not in all_node_slots_already_taken]
        
        if not node_slots_still_availible:
            overflow_node_slots_already_taken = self.assigned_shadow_slots(self.current_generation)
            availible_overflow_node_slots = [slot for slot in range(self.generation_size) if slot not in overflow_node_slots_already_taken]
            
            if not availible_overflow_node_slots:
                random_slot = random.choice(range(self.generation_size))
                self.log("No Epxerimental or Shadow slots availible for Participant {} in network {} [Cond: {}; Rep: {}; Gen: {}]. Assigning slot {} at random.".format(participant.id, self.id, self.condition, self.replication, self.current_generation, random_slot), key)
                return random_slot

            random_slot = random.choice(availible_overflow_node_slots)
            self.log("No Epxerimental slots availible for Participant {} in network {} [Cond: {}; Rep: {}; Gen: {}]. Assigning Shadow slot {} at random (from {} availible).".format(participant.id, self.id, self.condition, self.replication, self.current_generation, random_slot, len(availible_overflow_node_slots)), key)
            return random_slot
        
        random_slot = random.choice(node_slots_still_availible)
        self.log("{} Epxerimental slots remain availible for Participant {} in network {} [Cond: {}; Rep: {}; Gen: {}]. Assigning slot {} at random.".format(len(node_slots_still_availible), participant.id, self.id, self.condition, self.replication,self.current_generation, random_slot), key)
        return random_slot

    def reassign_slot(self, current_slot, generation):
        """Choose a new slot for a participant who's provisionally assigned slot is taken"""
        key = "models.py >> reassign_slot: "
        relevant_variables = json.loads(NetworkRandomAttributes.query.filter_by(network_id = self.id).one().details)
        payout_colors, button_orders = relevant_variables["payout_color"], relevant_variables["button_order"]
        equivelant_slots = [
            int(k) for (k, v) in payout_colors.items() 
            if ((v == payout_colors[str(current_slot)]) 
            and (int(k) != int(current_slot)) 
            and (button_orders[str(k)] == button_orders[str(current_slot)]))
        ]
        self.log("There are {} slots with equivelant randomisation conditions to slot {}".format(len(equivelant_slots), current_slot), key)
        availible_slots = [slot for slot in equivelant_slots if slot not in self.full_slots(generation)]
        self.log("{} of the {} slots equivelant to slot {} are availible.".format(len(availible_slots), len(equivelant_slots), current_slot), key)
        return None if not availible_slots else random.choice(availible_slots)

    # @pysnooper.snoop()
    def distribute(self, node, nodes):
        key = "models.py >> distribute: "
        """Decide whether a participant keeps the provisional node or is reassigned."""
        assigned_slot = node.slot
        slot_occupied = assigned_slot in self.full_slots(int(node.generation), ignore_id = node.participant_id)
        if slot_occupied:
            self.log("Participant {} [Gen: {}; Cond: {}; Slot: {} (= Shadow)] is in a slot that is already occupied. Attempting reassignment.".format(node.participant_id, node.generation, node.condition, node.slot), key)
            new_slot = self.reassign_slot(current_slot = assigned_slot, generation = int(node.generation))
            
            if new_slot is not None:
                for participant_node in nodes:
                    participant_node.slot = new_slot
                self.log("Reassignment succesful. Participant {} [Gen: {}; Cond: {}; Slot: {}] has been given a new slot ({}) and assigned status: Experimental. All nodes updated.".format(node.participant_id, node.generation, node.condition, node.slot, new_slot), key)
            
            else:
                for participant_node in nodes:
                    participant_node.property5 = node.property5 + ":OVF"
                self.log("Reassignment failed. Participant {} [Gen: {}; Cond: {}; Slot: {} (= Shadow)] has been assigned status: Overflow. All nodes updated.".format(node.participant_id, node.generation, node.condition, node.slot), key)

        else:
            self.log("Participant {} [Gen: {}; Cond: {}; Slot: {} (= availible)] has been assigned status: Experimental".format(node.participant_id, node.generation, node.condition, node.slot), key)

    def generation_complete(self, generation = None):
        """Is the generation complete -- are all slots full?"""
        if generation is None:
            generation = self.current_generation
        return np.all([slot in self.full_slots(generation) for slot in range(int(self.generation_size))])

    def network_full(self):
        """Have all experimental nodes been collected?"""
        return Particle.query.filter_by(network_id = self.id, failed = False).filter(not_(Particle.property5.contains("OVF"))).count() >= self.max_size

    def experimental_nodes_approved_this_generation(self, generation):
        approved_participants = Participant.query.filter_by(status="approved", failed = False).all()
        approved_participant_ids = [p.id for p in approved_participants]
        return (Particle.query.filter_by(network_id = self.id, failed = False).filter(and_(
            Particle.property2 == repr(int(generation)),
            Particle.participant_id.in_(approved_participant_ids),
            not_(Particle.property5.contains("OVF"))))
        .count())

    def overflow_uptake_this_generation(self):
        """How many participants started working or have completed working this generation?"""
        uptake = (Particle.query.filter_by(failed = False, network_id = self.id)
            .filter(Particle.property2 == repr(self.current_generation))
            .count() - self.generation_size)
        return max([0, uptake])

    def create_node(self, participant, slot = None):
        if slot is None:
            slot = self.assign_slot(participant)
        return Particle(network=self, participant=participant, slot = slot)

    def overflow_nodes_approved_this_generation(self, generation):
        return Particle.query.filter_by(network_id = self.id, failed = False).filter(and_(Particle.property2 == repr(int(generation)), Particle.property5.contains("OVF"))).count()

    def _select_oldest_source(self):
        return min(self.nodes(type=Environment), key=attrgetter("creation_time"))

    def _sample_parent(self, generation):
        """randomly sample a non-overflow node from generation"""
        # property5 is condition; property5 is genration;
        return random.choice(Particle.query.filter_by(failed = False).filter(and_(Particle.property2 == repr(int(generation)), not_(Particle.property5.contains("OVF")), Particle.network_id == self.id)).all())

    # @pysnooper.snoop()
    def add_node(self, node, generation = None):

        node.generation = int(self.current_generation) if generation is None else int(generation)

        if int(node.generation) == 0:
            parent = self._select_oldest_source()
        
        else:
            parent = self._sample_parent(int(node.generation) - 1)
        
        if parent is not None:
            parent.connect(whom=node)
            parent.transmit(to_whom=node)

        node.receive()

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

    @hybrid_property
    def overflow_pool(self):
        """Convert property3 to genertion."""
        return int(self.property3)

    @overflow_pool.setter
    def overflow_pool(self, overflow_pool):
        """Make overflow_pool settable."""
        self.property3 = repr(overflow_pool)

    @overflow_pool.expression
    def overflow_pool(self):
        """Make overflow_pool queryable."""
        return cast(self.property3, Integer)

    # #@pysnooper.snoop()
    def sample_parents(self):
        N = self.generations
        n = self.network.generation_size
        parents = {}
        for g in range(1, N):
            parents[g] = dict(zip(list(range(n)), random.choices(list(range(n)), k = n)))
        return parents

    def sample_payout_colors(self):
        n = float(self.network.generation_size)
        return dict(zip(range(int(n)), (["green"] * int(n / 2.)) + (["green"] * int(n / 2.))))

    def sample_button_order(self):
        n = float(self.network.generation_size)
        # uncomment below for real exp; commented so no need to run four per gen
        # return dict(zip(range(int(n)), (["left"] * int(n / 4.)) + (["right"] * int(n / 4.)) + (["left"] * int(n / 4.)) + (["right"] * int(n / 4.))))
        return dict(zip(range(int(n)), (["left"] * int(n / 2.)) + (["right"] * int(n / 2.))))

    def __init__(self, network, generations, overflow_pool, details = None):
        super(NetworkRandomAttributes, self).__init__(network)
        self.generations = generations
        self.details = json.dumps({"parentschedule": self.sample_parents(), "payout_color": self.sample_payout_colors(), "button_order": self.sample_button_order()})
        self.current_generation = 0
        self.overflow_pool = overflow_pool

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



class BiasReport(Info):

    @declared_attr
    def __mapper_args__(cls):
        """The name of the source is derived from its class name."""
        return {
            "polymorphic_identity": cls.__name__.lower()
        }




