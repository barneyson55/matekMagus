import 'package:connectivity_plus/connectivity_plus.dart';

import '../../domain/services/connectivity_service.dart';

class ConnectivityPlusService implements ConnectivityService {
  ConnectivityPlusService({Connectivity? connectivity})
      : _connectivity = connectivity ?? Connectivity();

  final Connectivity _connectivity;

  @override
  Future<bool> checkIsOnline() async {
    final result = await _connectivity.checkConnectivity();
    return _hasConnection(result);
  }

  @override
  Stream<bool> watchIsOnline() {
    return _connectivity.onConnectivityChanged
        .map(_hasConnection)
        .distinct();
  }

  bool _hasConnection(dynamic result) {
    if (result is ConnectivityResult) {
      return result != ConnectivityResult.none;
    }
    if (result is List<ConnectivityResult>) {
      return result.any((entry) => entry != ConnectivityResult.none);
    }
    return false;
  }
}
