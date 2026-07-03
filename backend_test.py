#!/usr/bin/env python3
"""
Backend API tests for Spotted Jobs
Tests all high-priority backend endpoints as specified in test_result.md
"""

import requests
import json
import sys
from io import BytesIO

# Base URL from .env
BASE_URL = "https://086f196d-dff8-4251-9010-877b60237944.preview.emergentagent.com"

def test_health():
    """Test 1: GET /api/health - expect 200 with ok:true and all env flags true"""
    print("\n" + "="*80)
    print("TEST 1: GET /api/health")
    print("="*80)
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        if not data.get('ok'):
            print(f"❌ FAILED: Expected ok:true, got {data.get('ok')}")
            return False
        
        env = data.get('env', {})
        required_flags = ['supabase_url', 'supabase_anon', 'supabase_service', 'mapbox', 'llm']
        all_true = all(env.get(flag) for flag in required_flags)
        
        if not all_true:
            print(f"❌ FAILED: Not all env flags are true: {env}")
            return False
        
        print(f"✅ PASSED: Health check OK with all env flags true")
        return True
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        return False


def test_jobs_no_query():
    """Test 2: GET /api/jobs (no query) - expect 200 with { jobs: [] }"""
    print("\n" + "="*80)
    print("TEST 2: GET /api/jobs (no query)")
    print("="*80)
    try:
        response = requests.get(f"{BASE_URL}/api/jobs", timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        if 'jobs' not in data:
            print(f"❌ FAILED: Expected 'jobs' key in response")
            return False
        
        if not isinstance(data['jobs'], list):
            print(f"❌ FAILED: Expected jobs to be an array")
            return False
        
        print(f"✅ PASSED: Got jobs array with {len(data['jobs'])} items")
        return True
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        return False


def test_jobs_geo_query():
    """Test 3: GET /api/jobs with geo query - expect 200 with { jobs: [] }"""
    print("\n" + "="*80)
    print("TEST 3: GET /api/jobs with geo query (lat=51.5074, lng=-0.1276, radius_m=10000)")
    print("="*80)
    try:
        params = {
            'lat': 51.5074,
            'lng': -0.1276,
            'radius_m': 10000
        }
        response = requests.get(f"{BASE_URL}/api/jobs", params=params, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            if response.status_code == 500:
                print("⚠️  CRITICAL: 500 error may indicate PostGIS RPC signature mismatch")
            return False
        
        data = response.json()
        if 'jobs' not in data:
            print(f"❌ FAILED: Expected 'jobs' key in response")
            return False
        
        if not isinstance(data['jobs'], list):
            print(f"❌ FAILED: Expected jobs to be an array")
            return False
        
        print(f"✅ PASSED: Got jobs array with {len(data['jobs'])} items")
        return True
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        return False


def test_jobs_category_filter():
    """Test 4: GET /api/jobs with category filter - expect 200 with { jobs: [] }"""
    print("\n" + "="*80)
    print("TEST 4: GET /api/jobs with category filter (hospitality)")
    print("="*80)
    try:
        params = {
            'lat': 51.5074,
            'lng': -0.1276,
            'radius_m': 10000,
            'category': 'hospitality'
        }
        response = requests.get(f"{BASE_URL}/api/jobs", params=params, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        if 'jobs' not in data:
            print(f"❌ FAILED: Expected 'jobs' key in response")
            return False
        
        if not isinstance(data['jobs'], list):
            print(f"❌ FAILED: Expected jobs to be an array")
            return False
        
        print(f"✅ PASSED: Got jobs array with {len(data['jobs'])} items")
        return True
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        return False


def test_upload_unauthenticated():
    """Test 5: POST /api/jobs/upload unauthenticated - expect 401"""
    print("\n" + "="*80)
    print("TEST 5: POST /api/jobs/upload (unauthenticated)")
    print("="*80)
    try:
        # Create a dummy image file
        files = {
            'image': ('test.jpg', BytesIO(b'\xff\xd8\xff\xe0\x00\x10JFIF'), 'image/jpeg')
        }
        data = {
            'lat': '51.5074',
            'lng': '-0.1276'
        }
        response = requests.post(f"{BASE_URL}/api/jobs/upload", files=files, data=data, timeout=30)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 401:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            return False
        
        data = response.json()
        if 'error' not in data:
            print(f"❌ FAILED: Expected 'error' key in response")
            return False
        
        if 'Unauthorized' not in data['error']:
            print(f"❌ FAILED: Expected 'Unauthorized' in error message")
            return False
        
        print(f"✅ PASSED: Correctly rejected unauthenticated upload with 401")
        return True
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        return False


def test_vote_unauthenticated():
    """Test 7: POST /api/jobs/:id/vote unauthenticated - expect 401"""
    print("\n" + "="*80)
    print("TEST 7: POST /api/jobs/:id/vote (unauthenticated)")
    print("="*80)
    try:
        job_id = "00000000-0000-0000-0000-000000000000"
        payload = {"kind": "still_active"}
        response = requests.post(
            f"{BASE_URL}/api/jobs/{job_id}/vote",
            json=payload,
            timeout=10
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 401:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            return False
        
        data = response.json()
        if 'error' not in data:
            print(f"❌ FAILED: Expected 'error' key in response")
            return False
        
        if 'Unauthorized' not in data['error']:
            print(f"❌ FAILED: Expected 'Unauthorized' in error message")
            return False
        
        print(f"✅ PASSED: Correctly rejected unauthenticated vote with 401")
        return True
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        return False


def test_vote_bad_kind():
    """Test 8: POST /api/jobs/:id/vote with bad kind - expect 401 (auth check first)"""
    print("\n" + "="*80)
    print("TEST 8: POST /api/jobs/:id/vote (bad kind, unauthenticated)")
    print("="*80)
    try:
        job_id = "00000000-0000-0000-0000-000000000000"
        payload = {"kind": "invalid_kind"}
        response = requests.post(
            f"{BASE_URL}/api/jobs/{job_id}/vote",
            json=payload,
            timeout=10
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Auth check happens first, so we expect 401
        if response.status_code != 401:
            print(f"❌ FAILED: Expected 401 (auth check first), got {response.status_code}")
            return False
        
        print(f"✅ PASSED: Auth check happens before validation (401)")
        return True
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        return False


def test_oauth_callback_no_code():
    """Test 9: GET /auth/callback without code - expect 3xx redirect with error=missing_code"""
    print("\n" + "="*80)
    print("TEST 9: GET /auth/callback (no code param)")
    print("="*80)
    try:
        response = requests.get(
            f"{BASE_URL}/auth/callback",
            allow_redirects=False,
            timeout=10
        )
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code not in [301, 302, 303, 307, 308]:
            print(f"❌ FAILED: Expected 3xx redirect, got {response.status_code}")
            return False
        
        location = response.headers.get('Location', '')
        print(f"Location: {location}")
        
        if 'error=missing_code' not in location:
            print(f"❌ FAILED: Expected 'error=missing_code' in Location header")
            return False
        
        print(f"✅ PASSED: Correctly redirects with error=missing_code")
        return True
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        return False


def test_magic_link_confirm_no_params():
    """Test 10: GET /auth/confirm without params - expect 3xx redirect with error=bad_link"""
    print("\n" + "="*80)
    print("TEST 10: GET /auth/confirm (no params)")
    print("="*80)
    try:
        response = requests.get(
            f"{BASE_URL}/auth/confirm",
            allow_redirects=False,
            timeout=10
        )
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code not in [301, 302, 303, 307, 308]:
            print(f"❌ FAILED: Expected 3xx redirect, got {response.status_code}")
            return False
        
        location = response.headers.get('Location', '')
        print(f"Location: {location}")
        
        if 'error=bad_link' not in location:
            print(f"❌ FAILED: Expected 'error=bad_link' in Location header")
            return False
        
        print(f"✅ PASSED: Correctly redirects with error=bad_link")
        return True
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        return False


def main():
    """Run all backend tests"""
    print("\n" + "="*80)
    print("SPOTTED JOBS BACKEND API TESTS")
    print(f"Base URL: {BASE_URL}")
    print("="*80)
    
    tests = [
        ("Health endpoint", test_health),
        ("Jobs list (no query)", test_jobs_no_query),
        ("Jobs with geo query", test_jobs_geo_query),
        ("Jobs with category filter", test_jobs_category_filter),
        ("Upload unauthenticated", test_upload_unauthenticated),
        ("Vote unauthenticated", test_vote_unauthenticated),
        ("Vote bad kind", test_vote_bad_kind),
        ("OAuth callback no code", test_oauth_callback_no_code),
        ("Magic link confirm no params", test_magic_link_confirm_no_params),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            passed = test_func()
            results.append((name, passed))
        except Exception as e:
            print(f"\n❌ Test '{name}' crashed: {str(e)}")
            results.append((name, False))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    passed_count = sum(1 for _, passed in results if passed)
    total_count = len(results)
    
    for name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed_count}/{total_count} tests passed")
    print("="*80)
    
    return 0 if passed_count == total_count else 1


if __name__ == "__main__":
    sys.exit(main())
