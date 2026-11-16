
import socket
import ssl
import certifi

HOSTS = [
    "ac-a98t1qe-shard-00-00.xd6zob4.mongodb.net",
    "ac-a98t1qe-shard-00-01.xd6zob4.mongodb.net",
    "ac-a98t1qe-shard-00-02.xd6zob4.mongodb.net"
]

def test_tls(host, version_name, version):
    print(f"\nTesting {host} using {version_name}")

    context = ssl.create_default_context(
        cafile=certifi.where()
    )

    context.minimum_version = version
    context.maximum_version = version

    try:
        with socket.create_connection(
            (host, 27017),
            timeout=10
        ) as sock:

            with context.wrap_socket(
                sock,
                server_hostname=host
            ) as secure_socket:

                print("SUCCESS")
                print("Negotiated:", secure_socket.version())
                print("Certificate:", secure_socket.getpeercert().get("subject"))

    except Exception as error:
        print("FAILED:", type(error).__name__, error)


for host in HOSTS:
    test_tls(host, "TLS 1.2", ssl.TLSVersion.TLSv1_2)
    test_tls(host, "TLS 1.3", ssl.TLSVersion.TLSv1_3)
