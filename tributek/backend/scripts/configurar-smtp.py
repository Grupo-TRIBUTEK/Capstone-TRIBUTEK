#!/usr/bin/env python3
"""Configura Gmail sin mostrar ni guardar su credencial en el historial de la terminal."""
from pathlib import Path
from datetime import datetime
import getpass
import json
import os
import re
import subprocess

backend = Path(__file__).resolve().parent.parent
os.chdir(backend)
print('Remitente de TRIBUTEK. Usa una contraseña de aplicación de Google, no tu contraseña habitual.')
user = input('Correo remitente de Gmail o Google Workspace: ').strip().lower()
if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', user):
    raise SystemExit('El correo debe incluir @ y un punto en el dominio.')
password = getpass.getpass('Contraseña de aplicación de Google (no se mostrará): ').replace(' ', '')
if not password:
    raise SystemExit('No se modificó la configuración.')
settings = {'SMTP_HOST': 'smtp.gmail.com', 'SMTP_PORT': '465', 'SMTP_USER': user, 'SMTP_PASS': password}
probe = """
import nodemailer from 'nodemailer'
const transport = nodemailer.createTransport({host:process.env.SMTP_HOST,port:465,secure:true,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:10000,socketTimeout:15000})
try { await transport.verify() } catch { process.exitCode=1 } finally { transport.close() }
"""
result = subprocess.run(['node', '--input-type=module', '-e', probe], env={**os.environ, **settings}, capture_output=True, text=True)
if result.returncode:
    raise SystemExit('Google no autorizó la conexión. No se guardó la credencial. Revisa el correo y su contraseña de aplicación.')
path = backend / '.env'
original = path.read_text()
private = backend / '.tmp'
private.mkdir(mode=0o700, exist_ok=True)
backup = private / ('env-antes-smtp-' + datetime.now().strftime('%Y%m%d-%H%M%S'))
backup.write_text(original)
backup.chmod(0o600)
text = original
for key, value in settings.items():
    line = key + '=' + json.dumps(value)
    if re.search(r'^' + re.escape(key) + '=', text, flags=re.M):
        text = re.sub(r'^' + re.escape(key) + r'=.*$', lambda match: line, text, flags=re.M)
    else:
        text = text.rstrip() + '\n' + line + '\n'
temporary = private / 'env-smtp-nuevo'
temporary.write_text(text)
temporary.chmod(0o600)
os.replace(temporary, path)
print('Conexión SMTP verificada y configuración guardada. Reinicia el backend. No se envió ningún correo de prueba.')
