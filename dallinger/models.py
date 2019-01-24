from operator import attrgetter
import random

from sqlalchemy import Float, Integer
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.sql.expression import cast

from dallinger import transformations
from dallinger.information import Gene, Meme, State
from dallinger.nodes import Agent, Environment, Source


class RogersAgent(Agent):
    """The Rogers Agent."""

    __mapper_args__ = {"polymorphic_identity": "rogers_agent"}

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
    def score(self):
        """Convert property3 to score."""
        return int(self.property3)

    @score.setter
    def score(self, score):
        """Mark score settable."""
        self.property3 = repr(score)

    @score.expression
    def score(self):
        """Make score queryable."""
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

    def calculate_fitness(self):
        """Calculcate your fitness."""
        if self.fitness is not None:
            raise Exception("You are calculating the fitness of agent {}, "
                            .format(self.id) +
                            "but they already have a fitness")
        infos = self.infos()

        said_blue = ([i for i in infos if
                      isinstance(i, Meme)][0].contents == "blue")
        proportion = float(
            max(State.query.filter_by(network_id=self.network_id).all(),
                key=attrgetter('creation_time')).contents)
        self.proportion = proportion
        is_blue = proportion > 0.5

        if said_blue is is_blue:
            self.score = 1
        else:
            self.score = 0

        # TODO: test that selection of nodes is uniformly random
        # set fitness to 1 so that fitness isn't involved in network
        self.fitness = 1


class RogersEnvironment(Environment):
    """The Rogers environment."""

    __mapper_args__ = {"polymorphic_identity": "rogers_environment"}

    def create_state(self, proportion):
        """Create an environmental state."""
        if random.random() < 0.5:
            proportion = 1 - proportion
        State(origin=self, contents=proportion)

    def step(self):
        """Prompt the environment to change."""
        current_state = max(self.infos(type=State),
                            key=attrgetter('creation_time'))
        current_contents = float(current_state.contents)
        new_contents = 1 - current_contents
        info_out = State(origin=self, contents=new_contents)
        transformations.Mutation(info_in=current_state, info_out=info_out)
