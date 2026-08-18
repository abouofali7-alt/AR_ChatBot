import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  String baseUrl;
  String apiKey;

  ApiService({this.baseUrl = 'http://localhost:3000', this.apiKey = ''});

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (apiKey.isNotEmpty) 'Authorization': 'Bearer $apiKey',
  };

  Future<Map<String, dynamic>> chat(String message, {String? sessionId, String language = 'ar'}) async {
    return _post('/api/chat', {'message': message, 'sessionId': sessionId, 'language': language});
  }

  Future<List<dynamic>> getSessions() async {
    final result = await _get('/api/sessions');
    if (result is List) return result;
    return [];
  }

  Future<Map<String, dynamic>> getSession(String id) async {
    final result = await _get('/api/sessions/$id');
    if (result is Map<String, dynamic>) return result;
    return {};
  }

  Future<void> deleteSession(String id) async {
    await _delete('/api/sessions/$id');
  }

  Future<Map<String, dynamic>> getConfig() async {
    final result = await _get('/api/config');
    if (result is Map<String, dynamic>) return result;
    return {};
  }

  Future<Map<String, dynamic>> updateConfig(Map<String, dynamic> patch) async {
    final result = await _post('/api/config', patch);
    if (result is Map<String, dynamic>) return result;
    return {};
  }

  Future<List<dynamic>> getChannels() async {
    final result = await _get('/api/channels');
    if (result is List) return result;
    return [];
  }

  Future<Map<String, dynamic>> connectWhatsApp() async {
    final result = await _post('/api/channels/whatsapp/connect', {});
    if (result is Map<String, dynamic>) return result;
    return {};
  }

  Future<Map<String, dynamic>> disconnectWhatsApp() async {
    final result = await _post('/api/channels/whatsapp/disconnect', {});
    if (result is Map<String, dynamic>) return result;
    return {};
  }

  Future<Map<String, dynamic>> getWhatsAppStatus() async {
    final result = await _get('/api/channels/whatsapp/status');
    if (result is Map<String, dynamic>) return result;
    return {};
  }

  Future<Map<String, dynamic>> getWhatsAppQR() async {
    final result = await _get('/api/channels/whatsapp/qr');
    if (result is Map<String, dynamic>) return result;
    return {};
  }

  Future<Map<String, dynamic>> healthCheck() async {
    final result = await _get('/healthz');
    if (result is Map<String, dynamic>) return result;
    return {};
  }

  Future<dynamic> _get(String path) async {
    final res = await http.get(Uri.parse('$baseUrl$path'), headers: _headers);
    if (res.statusCode >= 400) throw Exception('HTTP ${res.statusCode}');
    return jsonDecode(res.body);
  }

  Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> body) async {
    final res = await http.post(Uri.parse('$baseUrl$path'), headers: _headers, body: jsonEncode(body));
    if (res.statusCode >= 400) throw Exception('HTTP ${res.statusCode}: ${res.body}');
    final data = jsonDecode(res.body);
    if (data is Map<String, dynamic>) return data;
    return {};
  }

  Future<void> _delete(String path) async {
    await http.delete(Uri.parse('$baseUrl$path'), headers: _headers);
  }
}
