import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

class CodeLabScreen extends StatefulWidget {
  final String serverUrl;
  final String token;
  const CodeLabScreen({super.key, this.serverUrl = 'http://localhost:3000', this.token = ''});

  @override
  State<CodeLabScreen> createState() => _CodeLabScreenState();
}

class _CodeLabScreenState extends State<CodeLabScreen> {
  final _promptCtrl = TextEditingController();
  final _editorCtrl = TextEditingController();
  String _lang = 'auto';
  bool _generating = false;
  String _status = 'Ready';
  bool _showOutput = true;
  String _terminal = '';
  String _generatedCode = '';

  final List<Map<String, String>> _languages = [
    {'value': 'auto', 'label': 'Auto Detect'},
    {'value': 'python', 'label': 'Python'},
    {'value': 'javascript', 'label': 'JavaScript'},
    {'value': 'html', 'label': 'HTML'},
    {'value': 'css', 'label': 'CSS'},
    {'value': 'typescript', 'label': 'TypeScript'},
    {'value': 'java', 'label': 'Java'},
    {'value': 'csharp', 'label': 'C#'},
    {'value': 'cpp', 'label': 'C++'},
    {'value': 'go', 'label': 'Go'},
    {'value': 'rust', 'label': 'Rust'},
    {'value': 'sql', 'label': 'SQL'},
    {'value': 'bash', 'label': 'Bash'},
  ];

  @override
  void dispose() {
    _promptCtrl.dispose();
    _editorCtrl.dispose();
    super.dispose();
  }

  String _detectLang(String code) {
    if (RegExp(r'def\s+\w+|import\s+\w+|from\s+\w+\s+import').hasMatch(code)) return 'python';
    if (RegExp(r'(?:function|const|let|var|=>|async|await|document\.|window\.)').hasMatch(code)) return 'javascript';
    if (RegExp(r'<!DOCTYPE|<html|<head|<body|<div|<script|<style').hasMatch(code)) return 'html';
    if (RegExp(r'SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER').hasMatch(code, caseSensitive: false)) return 'sql';
    if (RegExp(r'package\s+\w+|func\s+\w+|public\s+class').hasMatch(code)) return 'java';
    return 'code';
  }

  String _cleanCode(String raw) {
    return raw
        .replaceAll(RegExp(r'```\w*\n?'), '')
        .replaceAll(RegExp(r'```$'), '')
        .trim();
  }

  Future<void> _generate() async {
    if (_generating || _promptCtrl.text.trim().isEmpty) return;
    setState(() {
      _generating = true;
      _status = 'Generating...';
      _generatedCode = '';
      _editorCtrl.text = '';
    });

    try {
      final uri = Uri.parse('${widget.serverUrl}/api/code/generate');
      final response = await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${widget.token}',
        },
        body: jsonEncode({
          'prompt': _promptCtrl.text.trim(),
          'language': _lang,
        }),
      );

      if (response.statusCode != 200) {
        setState(() {
          _terminal = 'Error: HTTP ${response.statusCode}';
          _status = 'Error';
        });
        return;
      }

      final lines = response.body.split('\n');
      String full = '';
      for (final line in lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          final data = jsonDecode(line.substring(6));
          if (data['token'] != null && (data['token'] as String).isNotEmpty) {
            full += data['token'];
            final cleaned = _cleanCode(full);
            setState(() {
              _editorCtrl.text = cleaned;
              _generatedCode = cleaned;
            });
          }
        } catch (_) {}
      }

      final detected = _detectLang(_editorCtrl.text);
      setState(() {
        _status = 'Generated ${detected.toUpperCase()}';
      });
    } catch (e) {
      setState(() {
        _terminal = 'Error: $e';
        _status = 'Error';
      });
    }

    setState(() => _generating = false);
  }

  void _run() {
    final code = _editorCtrl.text.trim();
    if (code.isEmpty) return;
    final lang = _detectLang(code);

    setState(() {
      _showOutput = false;
      _status = 'Running ${lang.toUpperCase()}...';
    });

    if (['javascript', 'js', 'json'].contains(lang)) {
      setState(() {
        _terminal = 'JavaScript execution is available in the web version.\nCopy the code and run it in your browser console or Node.js.';
        _status = 'Copy & run locally';
      });
    } else if (['python', 'py'].contains(lang)) {
      setState(() {
        _terminal = r'$ python script.py' '\n\n'
            'Python execution requires a backend runtime.\n'
            'Copy the code and run it on your machine.\n\n'
            'Tip: Install Python from python.org and run:\n'
            '  python script.py';
        _status = 'Python - Copy & run locally';
      });
    } else if (lang == 'html') {
      setState(() {
        _terminal = 'HTML preview is available in the web version.\nCopy the code and open it in a browser.';
        _status = 'HTML - Copy & open in browser';
      });
    } else {
      setState(() {
        _terminal = 'Execution not available for $lang yet.\nCopy the code and run it in your local environment.';
        _status = '$lang - Copy & run locally';
      });
    }
  }

  void _copy() {
    Clipboard.setData(ClipboardData(text: _editorCtrl.text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Code copied!'), duration: Duration(seconds: 1)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: const Text('Code Lab', style: TextStyle(fontWeight: FontWeight.w600)),
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        actions: [
          IconButton(
            icon: const Icon(Icons.copy, size: 20),
            tooltip: 'Copy Code',
            onPressed: _copy,
          ),
          IconButton(
            icon: const Icon(Icons.play_arrow, size: 20),
            tooltip: 'Run Code',
            onPressed: _run,
          ),
        ],
      ),
      body: Column(
        children: [
          // Prompt area
          Container(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _promptCtrl,
                    maxLines: 2,
                    minLines: 1,
                    style: const TextStyle(fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Describe the code you want...',
                      hintStyle: TextStyle(color: Theme.of(context).hintColor),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      filled: true,
                      fillColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                    ),
                    onSubmitted: (_) => _generate(),
                  ),
                ),
                const SizedBox(width: 8),
                DropdownButton<String>(
                  value: _lang,
                  borderRadius: BorderRadius.circular(10),
                  style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurface),
                  underline: const SizedBox(),
                  items: _languages.map((l) => DropdownMenuItem(
                    value: l['value'],
                    child: Text(l['label']!),
                  )).toList(),
                  onChanged: (v) => setState(() => _lang = v ?? 'auto'),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: _generating ? null : _generate,
                  icon: _generating
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.play_arrow, size: 18),
                  label: Text(_generating ? '' : 'Generate'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),
          ),

          // Code editor + Output (split view)
          Expanded(
            child: Row(
              children: [
                // Editor
                Expanded(
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.surfaceContainerHighest,
                          border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
                        ),
                        child: Row(
                          children: [
                            Text(_status, style: TextStyle(fontSize: 12, color: Theme.of(context).hintColor)),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Container(
                          color: const Color(0xFF1A1A2E),
                          child: TextField(
                            controller: _editorCtrl,
                            maxLines: null,
                            expands: true,
                            style: const TextStyle(
                              fontFamily: 'Cascadia Code',
                              fontSize: 13,
                              color: Color(0xFFE0E0E0),
                              height: 1.5,
                            ),
                            decoration: const InputDecoration(
                              hintText: '// Generated code will appear here...\n// You can also edit it manually before running.',
                              hintStyle: TextStyle(color: Color(0xFF555555)),
                              border: InputBorder.none,
                              contentPadding: EdgeInsets.all(14),
                            ),
                            keyboardType: TextInputType.multiline,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Output/Terminal
                Expanded(
                  child: Column(
                    children: [
                      // Tabs
                      Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFF111125),
                          border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
                        ),
                        child: Row(
                          children: [
                            _tabButton('Output', _showOutput, () => setState(() => _showOutput = true)),
                            _tabButton('Terminal', !_showOutput, () => setState(() => _showOutput = false)),
                          ],
                        ),
                      ),
                      Expanded(
                        child: _showOutput
                            ? Container(
                                color: const Color(0xFF0D0D1A),
                                child: const Center(
                                  child: Text('Generate or Run code to see output',
                                      style: TextStyle(color: Color(0xFF888888), fontSize: 13)),
                                ),
                              )
                            : Container(
                                color: const Color(0xFF0D0D1A),
                                padding: const EdgeInsets.all(14),
                                child: SingleChildScrollView(
                                  child: Text(_terminal.isEmpty ? 'Terminal ready' : _terminal,
                                      style: const TextStyle(
                                        fontFamily: 'Cascadia Code',
                                        fontSize: 12,
                                        color: Color(0xFF00FF00),
                                        height: 1.5,
                                      )),
                                ),
                              ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _tabButton(String label, bool active, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: active ? const Color(0xFF19C37D) : Colors.transparent,
              width: 2,
            ),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: active ? const Color(0xFF19C37D) : Colors.grey,
          ),
        ),
      ),
    );
  }
}
