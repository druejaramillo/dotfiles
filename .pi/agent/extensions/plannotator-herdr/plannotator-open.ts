#!/usr/bin/env node
import { callHerdrApi } from "./herdr-json-api.ts";

const socket = process.env.PLANNOTATOR_HERDR_SOCKET;
if (!socket) throw new Error("Plannotator Herdr: the Pi review launcher is not running.");
// The publisher uses the same bounded JSON transport, but is private to this Pi process.
await callHerdrApi({ socket }, "open", { url: process.argv[2] });
