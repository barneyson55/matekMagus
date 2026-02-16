abstract class ConnectivityService {
  Stream<bool> watchIsOnline();
  Future<bool> checkIsOnline();
}
