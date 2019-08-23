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


@click.command()
@click.option('--infofile', '-i')
def run(infofile):
	df = pd.read_csv(infofile)

	df["utility_conditon"] = (df.payout_condition != 'no-utility').map({True:'utility', False:'no-utility'})

	df['condition'] = df.social_condition + "::" + df.utility_conditon

	def plotter(s, **kwargs):
		data = kwargs["data"]

		data['idx'] = data.groupby(['generation']).transform('rank', method='dense')['participant_id']
		
		data.apply(lambda row: plt.scatter(row.generation + 1, row.idx, color = "black" if row.chose_correct else "white", s = 35), axis = 1)

	g = sns.FacetGrid(df[(df.failed == 0) & (df.net_decision_index > 4) & (df.net_decision_index < 9)], col = 'condition', row = "net_decision_index")

	g.map_dataframe(plotter, "generation")

	plt.show()

	# z.to_csv('info-parsed.csv')

	# z = z[(z.is_practice == True)][['condition', 'trial_num', 'participant_id', 'choice', 'generation', 'proportionBlue']]

	# # z['player'] = z.groupby(['condition', 'generation']).transform('rank', method='dense')['participant_id']

	# logging.info("{}".format(z.iloc[0]))

	# z['choseBlue'] = (z.choice == 'blue').astype(int)

	# # sns.catplot(data = z[z.is_practice == False], x = 'generation', y = 'choseBlue', kind = 'bar', row = 'proportionBlue', col = "condition", )

	# g = sns.FacetGrid(data = z, col = 'condition', hue = 'generation', row = 'proportionBlue', dropna = False, margin_titles = True)

	# def plotter(x, **kwargs):
	# 	data = kwargs['data']

	# 	# data['idx'] = data.groupby(['generation']).transform('rank', method='dense')['participant_id']

	# 	dx = data.sort_values(['choice']).reset_index()

	# 	dx['idx'] = dx.index.values

	# 	# data['idxord'] = data.groupby(['generation', 'choice']).transform('rank', method='dense')['participant_id']

	# 	dx.apply(lambda row: plt.scatter(row.idx, row.generation + 1, color = row.choice), axis = 1)

	# g.map_dataframe(plotter, 'participant_id')

	# g.set_xlabels('Participant')
	# g.set_ylabels('Generation')

	# sns.despine(left = True, bottom = True)

	# plt.show()


if __name__ == '__main__':
    run()