#!/bin/bash
cd /opt
curl -LO https://dbmx.net/kyotocabinet/pkg/kyotocabinet-1.2.79.tar.gz
tar -xvzf kyotocabinet-1.2.79.tar.gz && mv kyotocabinet-1.2.79 kyotocabinet && rm kyotocabinet-1.2.79.tar.gz

apt-get update
apt-get -y install liblzo2-dev liblzma-dev zlib1g-dev build-essential
cd /opt/kyotocabinet && ./configure --enable-lzo --enable-lzma && make && make install
