"""Tests for Admin agent commission management and calculation."""
import pytest


def calculate_agent_commission(base_amount: float, commission_rate: float) -> float:
    """Standard calculation: (base_amount * commission_rate) / 100."""
    return round(base_amount * (commission_rate / 100.0), 2)


def validate_commission_rate(rate: float) -> bool:
    """Ensures commission rate is between 0% and 100%."""
    return 0.0 <= rate <= 100.0


def test_commission_calculation_standard():
    rate = 15.0  # default
    base_price = 1499.0
    comm = calculate_agent_commission(base_price, rate)
    assert comm == 224.85


def test_commission_calculation_admin_custom_rate():
    # Admin decides to set commission rate to 20%
    admin_rate = 20.0
    base_price = 2000.0
    comm = calculate_agent_commission(base_price, admin_rate)
    assert comm == 400.0


def test_commission_calculation_higher_tier():
    # Admin decides to reward high-performing agent with 25%
    admin_rate = 25.0
    base_price = 2499.0
    comm = calculate_agent_commission(base_price, admin_rate)
    assert comm == 624.75


def test_validate_commission_rate_valid_boundaries():
    assert validate_commission_rate(0.0) is True
    assert validate_commission_rate(15.5) is True
    assert validate_commission_rate(30.0) is True
    assert validate_commission_rate(100.0) is True


def test_validate_commission_rate_invalid():
    assert validate_commission_rate(-5.0) is False
    assert validate_commission_rate(105.0) is False
