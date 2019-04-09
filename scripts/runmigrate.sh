#!/usr/bin/env bash
yarn ganache:run & yarn migrate --reset && echo 'Migration done. Contracts deployed to ganache. Contract artifacts are in build/contracts folder.'