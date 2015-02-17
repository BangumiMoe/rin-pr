# opentracker

## original

http://erdgeist.org/arts/software/opentracker/

## mod

https://github.com/MartianZ/opentracker

### compile

```
export FEATURES="-DWANT_NOTIFY -DWANT_ACCESSLIST_WHITE -DWANT_COMPRESSION_GZIP -DWANT_IP_FROM_QUERY_STRING -DWANT_IP_FROM_PROXY"
make
```

### additional config

```
notify.ip 127.0.0.1:3005
notify.path api/tracker/update
notify.interval 60
```
