#!/bin/bash

cd $(cd -P -- "$(dirname -- "$0")" && pwd -P)

git pull


cd client/
npm install
npm run build

cd ../server/
pipenv install
systemctl restart ejectUBE
