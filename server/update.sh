#!/bin/bash

cd $(cd -P -- "$(dirname -- "$0")" && pwd -P)

pipenv update
systemctl --user restart ejectube-server
