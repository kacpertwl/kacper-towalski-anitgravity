@echo off
chcp 65001 > nul
title QuizApp Desktop

echo ======================================================
echo           QuizApp Desktop - Uruchamianie
echo ======================================================
echo.

if exist "node_modules\electron" (
    echo Uruchamianie w srodowisku Electron...
    npm.cmd start
) else (
    echo Uruchamianie samodzielnego okna aplikacji desktopowej...
    node desktop-runner.js
)
