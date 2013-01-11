#!/usr/bin/env bash

sudo /sbin/chkconfig mysqld on
sudo /sbin/service mysqld start
echo "CREATE USER 'ircloggr'@'localhost';" | mysql -u root
echo "CREATE DATABASE ircloggr;" | mysql -u root
echo "GRANT ALL ON ircloggr.* TO 'ircloggr'@'localhost';" | mysql -u root
