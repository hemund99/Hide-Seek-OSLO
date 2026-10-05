import {env} from 'cloudflare:workers';
export function db(){if(!env.DB)throw new Error('Game storage is unavailable. Please try again.');return env.DB;}
