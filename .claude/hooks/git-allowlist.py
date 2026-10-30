#!/usr/bin/env python3
# git 에이전트 전용 PreToolUse 훅: Bash 명령이 허용 목록(git/gh 하위 명령)에 없으면 막는다(exit 2).
# 샌드박스가 아니라 실수·잘못된 사용을 줄이는 안전장치다. 머지는 settings.json의 ask 규칙이 승인 단계가 된다.
import json
import shlex
import sys

GIT_OK = {'status', 'diff', 'log', 'show', 'branch', 'switch', 'add', 'commit', 'push', 'merge',
          'fetch', 'pull', 'rev-parse', 'ls-remote', 'reflog', 'worktree', 'remote'}
GH_OK = {'pr', 'api', 'repo', 'auth'}
OTHER_OK = {'cd', 'echo', 'ls', 'head', 'tail', 'grep', 'wc'}
OPERATORS = {'&&', '||', ';', '|', '&'}
REDIRECTS = {'>', '>>', '<', '<<', '<<<', '>&', '<&'}


def deny(reason):
    print(f'git 에이전트에서 허용되지 않는 명령입니다: {reason}', file=sys.stderr)
    sys.exit(2)


def check_git(args):
    i = 0
    while i < len(args) and args[i].startswith('-'):  # git 전역 옵션
        if args[i] == '-c' and i + 1 < len(args) and args[i + 1].startswith('credential.helper='):
            i += 2
        elif args[i] == '-C' and i + 1 < len(args):
            i += 2
        else:
            deny(f'git 전역 옵션 {args[i]}')
    if i >= len(args):
        deny('git 하위 명령 없음')
    sub, rest = args[i], args[i + 1:]
    if sub not in GIT_OK:
        deny(f'git {sub}')
    if sub == 'push' and any(a in ('-f', '--delete', '-d') or a.startswith('--force') for a in rest):
        deny('git push --force/--delete')
    if sub == 'push' and any(a == 'main' or a.endswith(':main') or a == 'HEAD:main' for a in rest):
        deny('main 푸시')
    if sub == 'branch' and any(a == '-D' or a == '--force' or a == '-f' for a in rest):
        deny('git branch -D')
    if sub == 'remote' and not (rest and rest[0] in ('-v', 'show', 'get-url')):
        deny('git remote 변경')
    if sub == 'worktree' and rest[:1] == ['remove'] and '--force' in rest:
        deny('git worktree remove --force')


def check_segment(tokens):
    if not tokens:
        return
    head, args = tokens[0], tokens[1:]
    if head == 'git':
        check_git(args)
    elif head == 'gh':
        if not args or args[0] not in GH_OK:
            deny(f'gh {args[0] if args else ""}')
    elif head not in OTHER_OK:
        deny(head)


def main():
    command = (json.load(sys.stdin).get('tool_input') or {}).get('command', '')
    if '`' in command or '$(' in command:
        deny('명령 치환($(...), 백틱). 커밋 메시지는 -m 옵션을 여러 번 써서 넘기세요')
    lexer = shlex.shlex(command, posix=True, punctuation_chars=True)
    lexer.whitespace_split = True
    segment = []
    for token in lexer:
        if token in REDIRECTS:
            deny(f'리다이렉션 {token}')
        if token in OPERATORS:
            check_segment(segment)
            segment = []
        else:
            segment.append(token)
    check_segment(segment)


if __name__ == '__main__':
    main()
