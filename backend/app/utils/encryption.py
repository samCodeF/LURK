"""
Encryption utilities for Lurk - Sensitive data protection
"""

import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import secrets

class DataEncryption:
    """Encryption service for sensitive data using Fernet (AES-128)"""

    def __init__(self):
        # Generate or load encryption key
        self.key = self._get_or_generate_key()
        self.cipher_suite = Fernet(self.key)

    def _get_or_generate_key(self) -> bytes:
        """Get encryption key from environment or generate new one"""
        key_str = os.getenv("ENCRYPTION_KEY")

        if key_str:
            return base64.urlsafe_b64decode(key_str.encode())
        else:
            # Generate new key for development
            return Fernet.generate_key()

    def encrypt(self, data: str) -> str:
        """Encrypt string data"""
        if not data:
            return data

        try:
            encrypted_data = self.cipher_suite.encrypt(data.encode())
            return base64.urlsafe_b64encode(encrypted_data).decode()
        except Exception as e:
            print(f"Encryption error: {e}")
            raise

    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt string data"""
        if not encrypted_data:
            return encrypted_data

        try:
            decoded_data = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = self.cipher_suite.decrypt(decoded_data)
            return decrypted_data.decode()
        except Exception as e:
            print(f"Decryption error: {e}")
            return ""

    def encrypt_dict(self, data_dict: dict) -> str:
        """Encrypt dictionary data"""
        import json
        json_str = json.dumps(data_dict)
        return self.encrypt(json_str)

    def decrypt_dict(self, encrypted_data: str) -> dict:
        """Decrypt dictionary data"""
        import json
        decrypted_json = self.decrypt(encrypted_data)
        try:
            return json.loads(decrypted_json)
        except:
            return {}

# Global encryption instance
encryption_service = DataEncryption()

def encrypt_sensitive_data(data: str) -> str:
    """Encrypt sensitive data (convenience function)"""
    return encryption_service.encrypt(data)

def decrypt_sensitive_data(encrypted_data: str) -> str:
    """Decrypt sensitive data (convenience function)"""
    return encryption_service.decrypt(encrypted_data)