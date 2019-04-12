FROM trufflesuite/ganache-cli:v6.4.2
COPY ["localchaindb", "dockerLocalchaindb"]
RUN ls -la dockerLocalchaindb