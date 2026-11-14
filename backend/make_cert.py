"""Make a self-signed HTTPS certificate for testing on your own Wi-Fi.

Phones only allow the live camera on https:// addresses. This creates dev_cert/cert.pem and dev_cert/key.pem
for localhost and this computer's Wi-Fi addresses, valid for 90 days. It is for testing only: phones will show a
"not private" warning once; tap Advanced, then Proceed. A real launch uses a proper certificate on your domain.

    python make_cert.py            # makes the certificate if missing or if the Wi-Fi address changed
    python make_cert.py --force    # always make a new one
"""
import datetime
import ipaddress
import os
import sys

import core

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "dev_cert")
CERT, KEY = os.path.join(OUT, "cert.pem"), os.path.join(OUT, "key.pem")


def wanted_ips():
    return ["127.0.0.1"] + core.lan_addresses()


def current_ips():
    """IP addresses in the existing certificate, or None if there is no usable certificate."""
    try:
        from cryptography import x509
        with open(CERT, "rb") as f:
            cert = x509.load_pem_x509_certificate(f.read())
        if cert.not_valid_after_utc < datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1):
            return None
        san = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
        return {str(ip) for ip in san.get_values_for_type(x509.IPAddress)}
    except Exception:
        return None


def make():
    try:
        from cryptography import x509
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.x509.oid import NameOID
    except ImportError:
        print("Please run this once, then try again:\n    pip install cryptography")
        sys.exit(1)
    os.makedirs(OUT, exist_ok=True)
    key = ec.generate_private_key(ec.SECP256R1())
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "DevBhumi local test"),
                      x509.NameAttribute(NameOID.ORGANIZATION_NAME, "DevBhumi (testing only)")])
    now = datetime.datetime.now(datetime.timezone.utc)
    ips = wanted_ips()
    san = [x509.DNSName("localhost")] + [x509.IPAddress(ipaddress.ip_address(ip)) for ip in ips]
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(x509.random_serial_number()).not_valid_before(now - datetime.timedelta(minutes=5))
            .not_valid_after(now + datetime.timedelta(days=90))
            .add_extension(x509.SubjectAlternativeName(san), critical=False)
            .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
            .add_extension(x509.ExtendedKeyUsage([x509.oid.ExtendedKeyUsageOID.SERVER_AUTH]), critical=False)
            .sign(key, hashes.SHA256()))
    with open(KEY, "wb") as f:
        f.write(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    with open(CERT, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
    print("Made a test certificate for: localhost, " + ", ".join(ips))


def main():
    have = current_ips()
    if "--force" in sys.argv or have is None or not set(wanted_ips()) <= have:
        make()
    else:
        print("Test certificate is up to date.")
    for ip in core.lan_addresses()[:1]:
        print(f"On your phone (same Wi-Fi): https://{ip}:8443   (tap Advanced, then Proceed, the first time)")


if __name__ == "__main__":
    main()
