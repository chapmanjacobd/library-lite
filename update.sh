#!/bin/bash

cd $(cd -P -- "$(dirname -- "$0")" && pwd -P)

git pull
pipenv update
systemctl restart ejectUBE
