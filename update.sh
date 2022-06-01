#!/bin/bash

cd $(cd -P -- "$(dirname -- "$0")" && pwd -P)

git pull

cd server/
pipenv update
systemctl restart ejectUBE

cd ../client/
npm install
npm run build
