#!/usr/bin/env bash
echo "launching ganache-cli (aka testrpc) with deterministic addresses in compatibility mode"
yarn ganache-cli \
--gasLimit 0x694920 \
--gasPrice 1000000000 \
--networkId 999 \
--noVMErrorsOnRPCResponse \
--blockTime 1 \
-m "hello build tongue rack parade express shine salute glare rate spice stock" \
"${@}"