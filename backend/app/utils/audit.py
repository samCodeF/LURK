"""
Audit logging for Lurk - Security events and compliance tracking
"""

import os
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import boto3
from botocore.exceptions import ClientError

# Configuration
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
AUDIT_LOG_BUCKET = os.getenv("AUDIT_LOG_BUCKET", "lurk-audit-logs")
AUDIT_LOG_PREFIX = "security-events/"

# AWS CloudWatch Logs for structured logging
cloudwatch_client = boto3.client(
    'logs',
    region_name=AWS_REGION,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)

# S3 for audit log archival
s3_client = boto3.client(
    's3',
    region_name=AWS_REGION,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)

# Configure structured logging
logger = logging.getLogger("lurk_audit")
logger.setLevel(logging.INFO)

# Create CloudWatch log group and stream
LOG_GROUP_NAME = "/lurk/audit/security"
LOG_STREAM_NAME = f"security-events-{datetime.now().strftime('%Y-%m-%d')}"

class AuditEvent:
    """Structured audit event for security logging"""

    def __init__(
        self,
        event_type: str,
        user_id: Optional[str],
        ip_address: Optional[str],
        details: Dict[str, Any] = None,
        severity: str = "INFO",
        risk_score: int = 0
    ):
        self.event_type = event_type
        self.user_id = user_id
        self.ip_address = ip_address
        self.details = details or {}
        self.severity = severity
        self.risk_score = risk_score
        self.timestamp = datetime.now(timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON logging"""
        return {
            "event_type": self.event_type,
            "user_id": self.user_id,
            "ip_address": self.ip_address,
            "details": self.details,
            "severity": self.severity,
            "risk_score": self.risk_score,
            "timestamp": self.timestamp.isoformat(),
            "timestamp_utc": self.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "environment": os.getenv("ENVIRONMENT", "development"),
            "service": "lurk-api",
            "version": os.getenv("APP_VERSION", "1.0.0")
        }

    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict(), default=str)

class AuditService:
    """Centralized audit logging service"""

    def __init__(self):
        self.log_group = LOG_GROUP_NAME
        self.log_stream = LOG_STREAM_NAME
        self.buffer = []
        self.buffer_size = 100  # Buffer up to 100 events
        self._ensure_log_group_exists()

    def _ensure_log_group_exists(self):
        """Ensure CloudWatch log group exists"""
        try:
            cloudwatch_client.create_log_group(logGroupName=self.log_group)
            cloudwatch_client.put_retention_policy(
                logGroupName=self.log_group,
                retentionInDays=90  # Keep logs for 90 days
            )
        except ClientError as e:
            if e.response['Error']['Code'] != 'ResourceAlreadyExistsException':
                logger.error(f"Failed to create log group: {e}")

        try:
            cloudwatch_client.create_log_stream(
                logGroupName=self.log_group,
                logStreamName=self.log_stream
            )
        except ClientError as e:
            if e.response['Error']['Code'] != 'ResourceAlreadyExistsException':
                logger.error(f"Failed to create log stream: {e}")

    async def log_event(
        self,
        event_type: str,
        user_id: Optional[str],
        ip_address: Optional[str],
        details: Dict[str, Any] = None,
        severity: str = "INFO",
        risk_score: int = 0,
        immediate: bool = False
    ):
        """Log security event"""
        try:
            event = AuditEvent(
                event_type=event_type,
                user_id=user_id,
                ip_address=ip_address,
                details=details,
                severity=severity,
                risk_score=risk_score
            )

            # Add to buffer
            self.buffer.append(event)

            # Send immediately if high risk or buffer is full
            if immediate or len(self.buffer) >= self.buffer_size or risk_score >= 50:
                await self._flush_buffer()

        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")

    async def _flush_buffer(self):
        """Flush buffered events to CloudWatch"""
        if not self.buffer:
            return

        try:
            # Convert events to CloudWatch format
            log_events = []
            for event in self.buffer:
                log_events.append({
                    'timestamp': int(event.timestamp.timestamp() * 1000),
                    'message': event.to_json()
                })

            # Send to CloudWatch
            cloudwatch_client.put_log_events(
                logGroupName=self.log_group,
                logStreamName=self.log_stream,
                logEvents=log_events
            )

            # Archive high-risk events to S3
            for event in self.buffer:
                if event.risk_score >= 50:
                    await self._archive_to_s3(event)

            # Clear buffer
            self.buffer.clear()

        except Exception as e:
            logger.error(f"Failed to flush audit buffer: {e}")

    async def _archive_to_s3(self, event: AuditEvent):
        """Archive high-risk event to S3"""
        try:
            # Create S3 key with date and event type
            date_prefix = event.timestamp.strftime("%Y/%m/%d")
            s3_key = f"{AUDIT_LOG_PREFIX}{date_prefix}/{event.event_type}/{event.timestamp.strftime('%H%M%S')}_{event.user_id or 'anonymous'}.json"

            # Upload to S3
            s3_client.put_object(
                Bucket=AUDIT_LOG_BUCKET,
                Key=s3_key,
                Body=event.to_json(),
                ContentType='application/json',
                ServerSideEncryption='AES256'
            )

        except Exception as e:
            logger.error(f"Failed to archive audit event to S3: {e}")

    async def log_security_event(
        self,
        event_type: str,
        user_id: Optional[str],
        ip_address: Optional[str],
        details: Dict[str, Any] = None
    ):
        """Log security event with appropriate risk assessment"""
        risk_score = self._calculate_risk_score(event_type, details)
        severity = self._determine_severity(risk_score)

        await self.log_event(
            event_type=event_type,
            user_id=user_id,
            ip_address=ip_address,
            details=details,
            severity=severity,
            risk_score=risk_score,
            immediate=risk_score >= 50
        )

    def _calculate_risk_score(self, event_type: str, details: Dict[str, Any]) -> int:
        """Calculate risk score for security event"""
        risk_scores = {
            "USER_LOGIN": 5,
            "USER_LOGIN_FAILED": 10,
            "USER_REGISTER": 15,
            "PASSWORD_CHANGED": 20,
            "KYC_VERIFIED": 25,
            "BIOMETRIC_SETUP": 30,
            "BIOMETRIC_VERIFY": 15,
            "PAYMENT_INITIATED": 25,
            "PAYMENT_FAILED": 30,
            "CARD_ADDED": 35,
            "CARD_REMOVED": 20,
            "SUBSCRIPTION_UPGRADED": 15,
            "SESSION_EXPIRED": 5,
            "RATE_LIMIT_EXCEEDED": 40,
            "SUSPICIOUS_LOGIN": 70,
            "UNAUTHORIZED_ACCESS": 80,
            "DATA_BREACH_ATTEMPT": 90,
            "SYSTEM_COMPROMISE": 100
        }

        base_score = risk_scores.get(event_type, 10)

        # Adjust based on details
        if details:
            if details.get("success") is False:
                base_score += 10
            if details.get("user_agent") and "bot" in details.get("user_agent", "").lower():
                base_score += 20
            if details.get("ip_country") and details.get("ip_country") not in ["IN", "US", "GB", "CA", "AU"]:
                base_score += 15

        return min(100, base_score)

    def _determine_severity(self, risk_score: int) -> str:
        """Determine severity level from risk score"""
        if risk_score >= 80:
            return "CRITICAL"
        elif risk_score >= 60:
            return "HIGH"
        elif risk_score >= 40:
            return "MEDIUM"
        elif risk_score >= 20:
            return "LOW"
        else:
            return "INFO"

    async def cleanup_old_logs(self, days_to_keep: int = 90):
        """Clean up old audit logs from S3"""
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
            cutoff_prefix = f"{AUDIT_LOG_PREFIX}{cutoff_date.strftime('%Y/%m/%d')}"

            # List and delete old objects
            paginator = s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=AUDIT_LOG_BUCKET, Prefix=cutoff_prefix)

            deleted_count = 0
            for page in pages:
                if 'Contents' in page:
                    delete_keys = [{'Key': obj['Key']} for obj in page['Contents']]
                    if delete_keys:
                        s3_client.delete_objects(
                            Bucket=AUDIT_LOG_BUCKET,
                            Delete={'Objects': delete_keys}
                        )
                        deleted_count += len(delete_keys)

            logger.info(f"Cleaned up {deleted_count} old audit log files")

        except Exception as e:
            logger.error(f"Failed to cleanup old audit logs: {e}")

    async def generate_security_report(
        self,
        start_date: datetime,
        end_date: datetime,
        event_types: Optional[list[str]] = None
    ) -> Dict[str, Any]:
        """Generate security report for specified period"""
        try:
            # Query CloudWatch Logs
            query = f"""
            fields @timestamp, event_type, severity, risk_score, user_id, ip_address
            | filter event_type in [{', '.join(event_types or ['*'])}]
            | parse @timestamp "*" as timestamp
            | stats
                count(*) as total_events,
                count_if(risk_score >= 50) as high_risk_events,
                count_if(severity = 'CRITICAL') as critical_events,
                count_if(severity = 'HIGH') as high_events,
                count_if(severity = 'MEDIUM') as medium_events,
                count_if(severity = 'LOW') as low_events,
                count_if(event_type = 'USER_LOGIN') as logins,
                count_if(event_type = 'USER_LOGIN_FAILED') as failed_logins,
                avg(risk_score) as avg_risk_score
            by bin(1h)
            """

            # Start query
            start_query_response = cloudwatch_client.start_query(
                logGroupName=self.log_group,
                startTime=int(start_date.timestamp()),
                endTime=int(end_date.timestamp()),
                queryString=query
            )

            query_id = start_query_response['queryId']

            # Wait for results
            results = []
            while True:
                response = cloudwatch_client.get_query_results(queryId=query_id)
                results = response.get('results', [])
                if response['status'] in ['Complete', 'Failed', 'Cancelled']:
                    break
                await asyncio.sleep(1)

            return {
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "summary": results,
                "query_id": query_id
            }

        except Exception as e:
            logger.error(f"Failed to generate security report: {e}")
            return {"error": str(e)}

# Global audit service instance
audit_service = AuditService()

# Convenience functions

async def log_security_event(
    event_type: str,
    user_id: Optional[str],
    ip_address: Optional[str],
    details: Dict[str, Any] = None
):
    """Log security event (convenience function)"""
    await audit_service.log_security_event(
        event_type=event_type,
        user_id=user_id,
        ip_address=ip_address,
        details=details
    )

async def log_user_action(
    user_id: str,
    action: str,
    ip_address: str,
    details: Dict[str, Any] = None
):
    """Log user action (convenience function)"""
    await audit_service.log_security_event(
        event_type=f"USER_{action.upper()}",
        user_id=user_id,
        ip_address=ip_address,
        details=details
    )

async def log_system_event(
    event_type: str,
    details: Dict[str, Any] = None,
    severity: str = "INFO"
):
    """Log system event (convenience function)"""
    await audit_service.log_event(
        event_type=event_type,
        user_id=None,
        ip_address=None,
        details=details,
        severity=severity
    )

async def log_compliance_event(
    event_type: str,
    user_id: Optional[str],
    compliance_area: str,
    details: Dict[str, Any] = None
):
    """Log compliance event (convenience function)"""
    await audit_service.log_security_event(
        event_type=f"COMPLIANCE_{event_type}",
        user_id=user_id,
        ip_address=None,
        details={
            "compliance_area": compliance_area,
            **(details or {})
        }
    )