"""Builds the presentation board. The skill's browser mockup invents <name>.com, and cutonce.com belongs to someone else."""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
SKILL = os.path.expanduser('~/.claude/plugins/cache/logo-design-skill/logo-design/1.4.5/skills/logo-design/scripts')
sys.path.insert(0, SKILL)
script = os.path.join(SKILL, 'presentation_board.py')

source = open(script, encoding='utf-8').read().replace('https://{handle}.com', 'https://cutonce.tools')
os.makedirs(os.path.join(KIT, 'board'), exist_ok=True)
sys.argv = [script, os.path.join(HERE, 'board-spec.json'), '-o', os.path.join(KIT, 'board/cut-once-board.html'),
            '--png-dir', os.path.join(KIT, 'board/slides')]
exec(compile(source, script, 'exec'), {'__name__': '__main__', '__file__': script})
