@echo off
title Bun Server - Hellix
echo Starting Bun server...

:main
REM
cls
bun run src/index.ts
goto main