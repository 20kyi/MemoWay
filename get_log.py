import subprocess

try:
    result = subprocess.run(['git', 'log', '--oneline', '-n', '100'], capture_output=True, text=True, encoding='utf-8')
    with open('py_git_log.txt', 'w', encoding='utf-8') as f:
        f.write(result.stdout)
        f.write("\nSTDERR:\n")
        f.write(result.stderr)
except Exception as e:
    with open('py_git_log.txt', 'w') as f:
        f.write(str(e))
