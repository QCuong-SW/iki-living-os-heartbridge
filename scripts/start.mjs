import { cp, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const root=process.cwd();
const standalone=path.join(root,'.next','standalone');
try {
  await access(path.join(standalone,'server.js'));
  await cp(path.join(root,'public'),path.join(standalone,'public'),{recursive:true});
  await cp(path.join(root,'.next','static'),path.join(standalone,'.next','static'),{recursive:true});
  const server=spawn(process.execPath,[path.join(standalone,'server.js')],{stdio:'inherit',env:{...process.env,HOSTNAME:process.env.HOSTNAME||'0.0.0.0'}});
  server.on('exit',code=>{process.exitCode=code??1;});
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.kill(signal));
} catch(error) { console.error('Run npm run build before starting HeartBridge.',error.message);process.exitCode=1; }
