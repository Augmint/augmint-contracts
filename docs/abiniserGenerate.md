1. in `scripts/runganache.sh` put the following parameters:
```
--noVMErrorsOnRPCResponse \
--blockTime 1 \
```

2. `yarn compile`
3. `yarn start` 
4. wait for `Migration done. Contracts deployed to ganache. Contract artifacts are in build/contracts folder.
`
5. `yarn abiniser:generate` (aka `yarn abiniser generate`)
