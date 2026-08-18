import 'package:flutter/material.dart';
import '../services/api_service.dart';

class SessionsScreen extends StatefulWidget {
  const SessionsScreen({super.key});
  @override
  State<SessionsScreen> createState() => _SessionsScreenState();
}

class _SessionsScreenState extends State<SessionsScreen> {
  final api = ApiService();
  List<dynamic> _sessions = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadSessions();
  }

  Future<void> _loadSessions() async {
    try {
      for (final port in [3000, 8080, 80]) {
        try {
          api.baseUrl = 'http://localhost:$port';
          final h = await api.healthCheck();
          if (h['ok'] == true) break;
        } catch (_) {}
      }
      final sessions = await api.getSessions();
      setState(() {
        _sessions = sessions;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sessions'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadSessions,
          ),
        ],
      ),
      body: _sessions.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.forum_outlined, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text('No sessions yet', style: TextStyle(color: Colors.grey[500], fontSize: 16)),
                  const SizedBox(height: 8),
                  Text('Sessions appear when users interact with your chatbot', style: TextStyle(color: Colors.grey[400])),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _sessions.length,
              itemBuilder: (ctx, i) {
                final s = _sessions[i];
                final lastMsg = s['lastMessage'];
                final ts = lastMsg?['ts'] != null ? DateTime.fromMillisecondsSinceEpoch(lastMsg['ts']) : null;
                return Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      child: Text('${s['messageCount'] ?? 0}'),
                    ),
                    title: Text(s['id']?.toString().substring(0, 12) ?? 'Unknown'),
                    subtitle: Text(lastMsg?['text']?.toString().substring(0, 50) ?? 'No messages'),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (ts != null)
                          Text(
                            '${ts.hour}:${ts.minute.toString().padLeft(2, '0')}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        const SizedBox(height: 4),
                        IconButton(
                          icon: const Icon(Icons.delete_outline, size: 20),
                          onPressed: () async {
                            await api.deleteSession(s['id']);
                            _loadSessions();
                          },
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
