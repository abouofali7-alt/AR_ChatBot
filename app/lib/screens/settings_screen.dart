import 'package:flutter/material.dart';
import '../services/api_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final api = ApiService();
  bool _loading = true;
  Map<String, dynamic> _config = {};

  final _companyController = TextEditingController();
  final _personalityController = TextEditingController();
  final _customInstructionsController = TextEditingController();
  String _selectedLang = 'ar';
  String _selectedModel = 'allam-2-7b';
  double _temperature = 0.7;

  @override
  void initState() {
    super.initState();
    _loadConfig();
  }

  Future<void> _loadConfig() async {
    try {
      for (final port in [3000, 8080, 80]) {
        try {
          api.baseUrl = 'http://localhost:$port';
          final h = await api.healthCheck();
          if (h['ok'] == true) break;
        } catch (_) {}
      }
      final config = await api.getConfig();
      setState(() {
        _config = config;
        _companyController.text = config['companyName'] ?? '';
        _personalityController.text = config['personality'] ?? '';
        _customInstructionsController.text = config['customInstructions'] ?? '';
        _selectedLang = config['defaultLanguage'] ?? 'ar';
        _selectedModel = config['aiModel'] ?? 'allam-2-7b';
        _temperature = (config['temperature'] ?? 0.7).toDouble();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    try {
      await api.updateConfig({
        'companyName': _companyController.text,
        'personality': _personalityController.text,
        'customInstructions': _customInstructionsController.text,
        'defaultLanguage': _selectedLang,
        'aiModel': _selectedModel,
        'temperature': _temperature,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Settings saved!'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        actions: [
          FilledButton.icon(
            onPressed: _save,
            icon: const Icon(Icons.save),
            label: const Text('Save'),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _sectionTitle('Company'),
            TextField(
              controller: _companyController,
              decoration: const InputDecoration(labelText: 'Company Name', border: OutlineInputBorder(), prefixIcon: Icon(Icons.business)),
            ),
            const SizedBox(height: 24),
            _sectionTitle('AI Personality'),
            TextField(
              controller: _personalityController,
              decoration: const InputDecoration(
                labelText: 'Personality Description',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.psychology),
                hintText: 'e.g., Friendly, professional, helpful...',
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 24),
            _sectionTitle('AI Model'),
            DropdownButtonFormField<String>(
              value: _selectedModel,
              decoration: const InputDecoration(labelText: 'Model', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'allam-2-7b', child: Text('Allam 2 7B (Arabic)')),
                DropdownMenuItem(value: 'llama-3.3-70b-versatile', child: Text('Llama 3.3 70B')),
                DropdownMenuItem(value: 'openai/gpt-oss-120b', child: Text('GPT OSS 120B')),
              ],
              onChanged: (v) => setState(() => _selectedModel = v ?? 'allam-2-7b'),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                const Text('Temperature: '),
                Expanded(
                  child: Slider(
                    value: _temperature,
                    min: 0.0,
                    max: 1.5,
                    divisions: 30,
                    label: _temperature.toStringAsFixed(1),
                    onChanged: (v) => setState(() => _temperature = v),
                  ),
                ),
                Text(_temperature.toStringAsFixed(1)),
              ],
            ),
            const SizedBox(height: 24),
            _sectionTitle('Language'),
            DropdownButtonFormField<String>(
              value: _selectedLang,
              decoration: const InputDecoration(labelText: 'Default Language', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'ar', child: Text('Arabic')),
                DropdownMenuItem(value: 'en', child: Text('English')),
                DropdownMenuItem(value: 'fr', child: Text('French')),
                DropdownMenuItem(value: 'tr', child: Text('Turkish')),
                DropdownMenuItem(value: 'hi', child: Text('Hindi')),
                DropdownMenuItem(value: 'es', child: Text('Spanish')),
                DropdownMenuItem(value: 'de', child: Text('German')),
              ],
              onChanged: (v) => setState(() => _selectedLang = v ?? 'ar'),
            ),
            const SizedBox(height: 24),
            _sectionTitle('Custom Instructions'),
            TextField(
              controller: _customInstructionsController,
              decoration: const InputDecoration(
                labelText: 'Additional Instructions for AI',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.notes),
                hintText: 'Any specific rules or behaviors...',
              ),
              maxLines: 4,
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
    );
  }
}
