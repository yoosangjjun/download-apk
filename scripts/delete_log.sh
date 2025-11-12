#!/bin/bash
# delete_log.sh
# 매일 cron.log 파일을 삭제하는 스크립트

LOG_FILE="/home/ubuntu/offout/scripts/cron.log"

if [ -f "$LOG_FILE" ]; then
    rm -f "$LOG_FILE"
fi

