# coding: utf-8
# billdthompson@berkeley.edu

# import numpy as np
# import pandas as pd
import click
import json
import requests
import logging
import pprint
logging.basicConfig(format='%(levelname)s > %(message)s', level=logging.INFO)

@click.command()
@click.option('--tmp', '-t')
def run(tmp):
	r = requests.get('http://0.0.0.0:5000/customsummary')
	pprint.pprint(json.loads(r.content)["summary"])
if __name__ == '__main__':
    run()