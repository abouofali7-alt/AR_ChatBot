import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final api = ApiService();
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  String? _sessionId;
  final List<Map<String, dynamic>> _messages = [];
  bool _loading = false;
  String _selectedLang = 'ar';

  final _langs = {
    'ar': 'العربية',
    'en': 'English',
    'fr': 'Francais',
    'tr': 'Turkce',
    'hi': 'हिन्दी',
    'es': 'Espanol',
    'de': 'Deutsch',
  };

  @override
  void initState() {
    super.initState();
    _detectServer();
  }

  Future<void> _detectServer() async {
    for (final port in [3000, 8080, 80]) {
      try {
        api.baseUrl = 'http://localhost:$port';
        final h = await api.healthCheck();
        if (h['ok'] == true) return;
      } catch (_) {}
    }
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _loading) return;

    setState(() {
      _messages.add({'role': 'user', 'text': text, 'ts': DateTime.now().millisecondsSinceEpoch});
      _loading = true;
      _controller.clear();
    });
    _scroll.animateTo(_scroll.position.maxScrollExtent + 80, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);

    try {
      final res = await api.chat(text, sessionId: _sessionId, language: _selectedLang);
      _sessionId = res['sessionId'];
      setState(() {
        _messages.add({'role': 'assistant', 'text': res['reply'] ?? '', 'ts': DateTime.now().millisecondsSinceEpoch});
      });
    } catch (e) {
      setState(() {
        _messages.add({'role': 'assistant', 'text': 'Error: ${e.toString()}', 'ts': DateTime.now().millisecondsSinceEpoch});
      });
    }

    setState(() => _loading = false);
    _scroll.animateTo(_scroll.position.maxScrollExtent + 80, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Test Chat'),
        actions: [
          DropdownButton<String>(
            value: _selectedLang,
            underline: const SizedBox(),
            items: _langs.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
            onChanged: (v) => setState(() => _selectedLang = v ?? 'ar'),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: () => setState(() {
              _messages.clear();
              _sessionId = null;
            }),
            tooltip: 'Clear chat',
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.chat_bubble_outline, size: 64, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        Text('Start a conversation', style: TextStyle(color: Colors.grey[500], fontSize: 16)),
                        const SizedBox(height: 8),
                        Text('Test your AI chatbot responses', style: TextStyle(color: Colors.grey[400])),
                      ],
                    ),
                  )
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (ctx, i) {
                      final msg = _messages[i];
                      final isUser = msg['role'] == 'user';
                      return Align(
                        alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          decoration: BoxDecoration(
                            color: isUser ? const Color(0xFF2563EB) : Theme.of(context).colorScheme.surfaceContainerHighest,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Text(
                            msg['text'],
                            style: TextStyle(color: isUser ? Colors.white : null),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          if (_loading) const LinearProgressIndicator(),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              border: Border(top: BorderSide(color: Theme.of(context).dividerColor)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    onSubmitted: (_) => _send(),
                    textDirection: TextDirection.ltr,
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      hintStyle: TextStyle(color: Colors.grey[500]),
                      border: const OutlineInputBorder(),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: _loading ? null : _send,
                  icon: const Icon(Icons.send),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
