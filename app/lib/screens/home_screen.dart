import 'package:flutter/material.dart';
import '../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final api = ApiService();
  int _selectedIndex = 0;
  bool _connected = false;
  String _serverUrl = 'http://localhost:3000';
  final _urlController = TextEditingController(text: 'http://localhost:3000');
  final _apiKeyController = TextEditingController();
  bool _showLogin = true;

  @override
  void initState() {
    super.initState();
    _checkServer();
  }

  Future<void> _checkServer() async {
    try {
      api.baseUrl = _serverUrl;
      final health = await api.healthCheck();
      if (health['ok'] == true) {
        setState(() {
          _connected = true;
          _showLogin = false;
        });
        _loadConfig();
      }
    } catch (_) {
      setState(() => _connected = false);
    }
  }

  Future<void> _loadConfig() async {
    try {
      final config = await api.getConfig();
      if (config['apiKey'] != null) {
        _apiKeyController.text = config['apiKey'];
      }
    } catch (_) {}
  }

  Future<void> _login() async {
    api.baseUrl = _urlController.text;
    api.apiKey = _apiKeyController.text;
    try {
      final health = await api.healthCheck();
      if (health['ok'] == true) {
        setState(() {
          _connected = true;
          _showLogin = false;
          _serverUrl = _urlController.text;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Connected!'), backgroundColor: Colors.green),
        );
      }
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Connection failed'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_showLogin) return _buildLogin();
    final isWide = MediaQuery.of(context).size.width > 800;
    return Scaffold(
      body: Row(
        children: [
          if (isWide) _buildSidebar(),
          Expanded(
            child: [
              _buildDashboard(),
              const SizedBox.shrink(),
              const SizedBox.shrink(),
            ][_selectedIndex],
          ),
        ],
      ),
      bottomNavigationBar: isWide ? null : _buildBottomNav(),
    );
  }

  Widget _buildLogin() {
    return Scaffold(
      body: Center(
        child: Card(
          child: Container(
            width: 400,
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.chat_bubble, size: 64, color: Color(0xFF2563EB)),
                const SizedBox(height: 16),
                Text('AR_ChatBot', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text('AI Customer Service Platform', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey)),
                const SizedBox(height: 32),
                TextField(
                  controller: _urlController,
                  decoration: const InputDecoration(labelText: 'Server URL', border: OutlineInputBorder(), prefixIcon: Icon(Icons.dns)),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _apiKeyController,
                  decoration: const InputDecoration(labelText: 'API Key', border: OutlineInputBorder(), prefixIcon: Icon(Icons.key)),
                  obscureText: true,
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _login,
                    icon: const Icon(Icons.login),
                    label: const Text('Connect'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSidebar() {
    return NavigationRail(
      selectedIndex: _selectedIndex,
      onDestinationSelected: (i) => setState(() => _selectedIndex = i),
      labelType: NavigationRailLabelType.all,
      leading: const Padding(
        padding: EdgeInsets.symmetric(vertical: 16),
        child: Icon(Icons.chat_bubble, size: 32, color: Color(0xFF2563EB)),
      ),
      destinations: const [
        NavigationRailDestination(icon: Icon(Icons.dashboard), label: Text('Dashboard')),
        NavigationRailDestination(icon: Icon(Icons.chat), label: Text('Chat')),
        NavigationRailDestination(icon: Icon(Icons.settings), label: Text('Settings')),
      ],
    );
  }

  Widget _buildBottomNav() {
    return NavigationBar(
      selectedIndex: _selectedIndex,
      onDestinationSelected: (i) {
        if (i == 1) {
          Navigator.pushNamed(context, '/chat');
          return;
        }
        if (i == 2) {
          Navigator.pushNamed(context, '/settings');
          return;
        }
        setState(() => _selectedIndex = i);
      },
      destinations: const [
        NavigationDestination(icon: Icon(Icons.dashboard), label: 'Dashboard'),
        NavigationDestination(icon: Icon(Icons.chat), label: 'Chat'),
        NavigationDestination(icon: Icon(Icons.settings), label: 'Settings'),
      ],
    );
  }

  Widget _buildDashboard() {
    return FutureBuilder<List<dynamic>>(
      future: api.getChannels(),
      builder: (ctx, snap) {
        final channels = snap.data ?? [];
        return SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('AR_ChatBot Dashboard', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text('Manage your AI customer service channels', style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Colors.grey)),
              const SizedBox(height: 32),
              Row(
                children: [
                  _statCard('Channels', '${channels.length}', Icons.hub, const Color(0xFF2563EB)),
                  const SizedBox(width: 16),
                  _statCard('Sessions', '0', Icons.forum, const Color(0xFF059669)),
                  const SizedBox(width: 16),
                  _statCard('Messages Today', '0', Icons.message, const Color(0xFFD97706)),
                ],
              ),
              const SizedBox(height: 32),
              Text('Channels', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              ...channels.map((ch) => _channelCard(ch)),
            ],
          ),
        );
      },
    );
  }

  Widget _statCard(String title, String value, IconData icon, Color color) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color, size: 28),
              const SizedBox(height: 12),
              Text(value, style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(title, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _channelCard(dynamic ch) {
    final connected = ch['connected'] == true;
    return Card(
      child: ListTile(
        leading: Icon(
          ch['id'] == 'whatsapp' ? Icons.phone_android : ch['id'] == 'telegram' ? Icons.send : Icons.language,
          color: connected ? Colors.green : Colors.grey,
        ),
        title: Text(ch['name'] ?? ''),
        subtitle: Text(connected ? 'Connected' : 'Disconnected'),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (connected)
              const Icon(Icons.check_circle, color: Colors.green)
            else
              const Icon(Icons.error_outline, color: Colors.orange),
            const SizedBox(width: 8),
            if (ch['id'] == 'whatsapp')
              FilledButton.tonal(
                onPressed: () async {
                  if (connected) {
                    await api.disconnectWhatsApp();
                  } else {
                    await api.connectWhatsApp();
                  }
                  setState(() {});
                },
                child: Text(connected ? 'Disconnect' : 'Connect'),
              ),
          ],
        ),
      ),
    );
  }
}
