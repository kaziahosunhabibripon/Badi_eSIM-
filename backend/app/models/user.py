import enum
from sqlalchemy import BigInteger, Column, String, DateTime, func
from app.core.database import Base


class UserRole(str, enum.Enum):
    CUSTOMER = "CUSTOMER"
    AGENT = "AGENT"


class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default=UserRole.CUSTOMER.value)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"