#!/bin/bash
set -u
cd /workspace/gyh-scrape-2026-11-03-1300
curl -s -o audio-2197789235.mp3 https://embed-ssl.wistia.com/deliveries/e7c4760edd7bae344f424d6d17c94fb4228734d5.bin
ffmpeg -y -loglevel error -i audio-2197789235.mp3 -ac 1 -ar 16000 audio-2197789235.wav
for i in 0 1 2 3 4 5; do ffmpeg -y -loglevel error -ss $((i*320)) -t 325 -i audio-2197789235.wav chunks/c$i.wav; done
run(){ /workspace/gyh-asr-venv/bin/whisper chunks/$1.wav --model small --language ro --task transcribe --output_format txt --output_dir transcripts --threads 2 --fp16 False > asr-$1.log 2>&1; echo "END $1 exit=$?" >> asr-runner.log; }
run c0 & run c1 & run c2 & run c3 & run c4 & run c5 &
wait
cat transcripts/c{0,1,2,3,4,5}.txt > transcripts/audio-2197789235.txt
echo ALL_ASR_DONE >> asr-runner.log
