#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
echo $DIR
case "$1" in
    runmigrate )
        $DIR/runmigrate.sh
        ;;

    runganache )
        $DIR/runganache.sh
        ;;

    *)
        echo "Usage: $0 {runmigrate|runganache}"
        ;;
esac