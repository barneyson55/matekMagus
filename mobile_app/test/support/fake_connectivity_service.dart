import 'dart:async';

import 'package:matekmagus_mobile/domain/services/connectivity_service.dart';

class FakeConnectivityService implements ConnectivityService {
  FakeConnectivityService({bool initialOnline = true})
      : _initialOnline = initialOnline;

  final bool _initialOnline;
  final StreamController<bool> _controller =
      StreamController<bool>.broadcast();

  @override
  Future<bool> checkIsOnline() async => _initialOnline;

  @override
  Stream<bool> watchIsOnline() => _controller.stream;

  void emitOnline(bool isOnline) {
    if (_controller.isClosed) {
      return;
    }
    _controller.add(isOnline);
  }

  Future<void> dispose() async {
    await _controller.close();
  }
}
