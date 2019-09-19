# coding: utf-8
# billdthompson@berkeley.edu

import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import json
import click
import logging
logging.basicConfig(format='%(levelname)s > %(message)s', level=logging.INFO)

def plotdots(df):

	# def plotter(x, **kwargs):
	# 	data = kwargs.pop("data")
	# 	plt.scatter(data.sort_values('generation').generation, data.sort_values('generation').slot)

	def plotter(x, **kwargs):
		data = kwargs['data']

		# data['idx'] = data.groupby(['generation']).transform('rank', method='dense')['participant_id']

		# # dx['idxord'] = data.groupby(['generation', 'choice']).transform('rank', method='dense')['participant_id']

		# dx['idxord'] = df.groupby(['generation'])

		# data.apply(lambda row: plt.scatter(row.generation + 1, row.idxord, color = "green" if row.chose_utility else "blue"), axis = 1)

		sums = data.groupby(['generation']).sum()['chose_utility']
		counts = data.groupby(['generation']).count()['chose_utility']
		ax = plt.gca()
		# ax.set_facecolor('blue')
		ax.patch.set_facecolor('green') if data.iloc[0].proportion_utility > .5 else ax.patch.set_facecolor('blue')
		ax.patch.set_alpha(0.3)

		for g in data.generation.unique():
			plt.scatter(np.ones(sums.loc[g]) * g, range(1, sums.loc[g] + 1), color = "green", s = 40)
			plt.scatter(np.ones(counts.loc[g] - sums.loc[g]) * g, range(sums.loc[g] + 1, counts.loc[g] + 1), color = "blue", s = 40)
		sns.despine(left = True, bottom = True)
	g = sns.FacetGrid(data = df, col = "condition_replication", row = "proportion_utility", dropna = False, margin_titles = True)
	g.map_dataframe(plotter, "generation")
	plt.show()



@click.command()
@click.option('--infofile', '-i')
@click.option('--nodefile', '-n')
def run(infofile, nodefile):
	nodes = pd.read_csv(nodefile).set_index('id')
	
	df = pd.read_csv(infofile)
	df = df[(df.type == "meme") & (df.failed == "f")].copy()
	df = pd.concat([df, df.contents.apply(json.loads).apply(pd.Series)], axis = 1)
	df['chose_utility'] = (df.choice == df.randomization_color).astype(int)
	df['chose_correct'] = ((df.proportion_utility > .5) & (df.chose_utility.astype(bool))) | ((df.proportion_utility < .5) & (~df.chose_utility.astype(bool)))
	df["asocial"] = df.generation == 0
	df["is_overflow"] = df.origin_id.map(lambda id_: "OVF" in (nodes.loc[id_].property5))
	# print(df.columns)
	# g = sns.catplot(data = df[~df.is_practice][['generation', "chose_utility", "social_condition", "condition_replication", 'k_chose_utility', 'proportion_utility']], x = "k_chose_utility", y = "chose_utility", hue = "social_condition", kind = "bar", row = "proportion_utility")
	# plt.show()
	# print(df[~df.is_practice].groupby(['social_condition', "asocial"]).mean()[['chose_utility', 'chose_correct']])
	plotdots(df[(df.social_condition == "social_with_info") & (df.is_practice) & ~(df.is_overflow)]) # & (df.trial_num > 8)

if __name__ == '__main__':
    run()