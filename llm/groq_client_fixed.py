"""
Groq LLM Client - FIXED VERSION
All LLM calls route through this module.
Swap-ready: change provider/models by editing only this file.

FIXES APPLIED:
✓ Better error handling for API key and initialization
✓ Retry logic for transient failures
✓ Improved logging
✓ Type hints and documentation
"""
import os
import logging
import time
from typing import AsyncGenerator, List, Dict, Optional
from groq import Groq, AsyncGroq

logger = logging.getLogger("llm.groq_client")

# ─── Model Configuration ─────────────────────────────────────────────────────
FAST_MODEL = "llama-3.1-8b-instant"        # Code gen, routing, quick tasks
THINK_MODEL = "llama-3.3-70b-versatile"    # Planning, reflection, insights

# ─── Client Initialization ───────────────────────────────────────────────────
_sync_client: Optional[Groq] = None
_async_client: Optional[AsyncGroq] = None


def _validate_api_key() -> str:
    """
    Validate and retrieve GROQ_API_KEY from environment
    
    Returns:
        API key string
        
    Raises:
        ValueError: If API key not found or empty
    """
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        logger.error("GROQ_API_KEY environment variable not set")
        raise ValueError(
            "GROQ_API_KEY environment variable is required. "
            "Please set it to your Groq API key."
        )
    return api_key


def _get_sync_client() -> Groq:
    """
    Get or create synchronous Groq client.
    
    Returns:
        Groq client instance
        
    Raises:
        ValueError: If API key not configured
        Exception: If Groq client initialization fails
    """
    global _sync_client
    if _sync_client is None:
        try:
            api_key = _validate_api_key()
            logger.debug("Initializing synchronous Groq client")
            _sync_client = Groq(api_key=api_key)
            logger.info("Groq sync client initialized successfully")
        except ValueError as e:
            logger.error(f"Configuration error: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize Groq sync client: {e}")
            raise Exception(f"Groq client initialization failed: {str(e)}")
    return _sync_client


def _get_async_client() -> AsyncGroq:
    """
    Get or create asynchronous Groq client.
    
    Returns:
        AsyncGroq client instance
        
    Raises:
        ValueError: If API key not configured
        Exception: If AsyncGroq client initialization fails
    """
    global _async_client
    if _async_client is None:
        try:
            api_key = _validate_api_key()
            logger.debug("Initializing asynchronous Groq client")
            _async_client = AsyncGroq(api_key=api_key)
            logger.info("Groq async client initialized successfully")
        except ValueError as e:
            logger.error(f"Configuration error: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize Groq async client: {e}")
            raise Exception(f"Groq async client initialization failed: {str(e)}")
    return _async_client


# ─── Synchronous Completion Functions ────────────────────────────────────────

def fast_complete(
    messages: List[Dict[str, str]],
    system_prompt: str = "",
    temperature: float = 0.7,
    max_tokens: int = 2048,
    max_retries: int = 3,
    retry_delay: float = 1.0
) -> str:
    """
    Fast completion using the lightweight model.
    Used for: code generation, routing, quick narration.
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        system_prompt: System instruction for the model
        temperature: Sampling temperature (0.0 - 1.0)
        max_tokens: Maximum tokens to generate
        max_retries: Number of retry attempts on failure
        retry_delay: Initial delay between retries (seconds)
        
    Returns:
        Generated text response
        
    Raises:
        ValueError: If API key not configured
        Exception: If all retries fail
    """
    full_messages = []
    if system_prompt:
        full_messages.append({"role": "system", "content": system_prompt})
    full_messages.extend(messages)
    
    last_error = None
    for attempt in range(max_retries):
        try:
            client = _get_sync_client()
            response = client.chat.completions.create(
                model=FAST_MODEL,
                messages=full_messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            content = response.choices[0].message.content or ""
            if attempt > 0:
                logger.info(f"fast_complete succeeded after {attempt} retries")
            return content
            
        except Exception as e:
            last_error = e
            logger.warning(f"fast_complete attempt {attempt + 1}/{max_retries} failed: {e}")
            
            if attempt < max_retries - 1:
                # Exponential backoff
                wait_time = retry_delay * (2 ** attempt)
                logger.debug(f"Retrying in {wait_time:.1f}s...")
                time.sleep(wait_time)
            else:
                logger.error(f"fast_complete failed after {max_retries} attempts")
    
    raise Exception(f"LLM completion failed after {max_retries} retries: {str(last_error)}")


def think_complete(
    messages: List[Dict[str, str]],
    system_prompt: str = "",
    temperature: float = 0.5,
    max_tokens: int = 4096,
    max_retries: int = 3,
    retry_delay: float = 1.0
) -> str:
    """
    Deep thinking completion using the larger model.
    Used for: planning, reflection, complex insights.
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        system_prompt: System instruction for the model
        temperature: Sampling temperature (0.0 - 1.0)
        max_tokens: Maximum tokens to generate
        max_retries: Number of retry attempts on failure
        retry_delay: Initial delay between retries (seconds)
        
    Returns:
        Generated text response
        
    Raises:
        ValueError: If API key not configured
        Exception: If all retries fail
    """
    full_messages = []
    if system_prompt:
        full_messages.append({"role": "system", "content": system_prompt})
    full_messages.extend(messages)
    
    last_error = None
    for attempt in range(max_retries):
        try:
            client = _get_sync_client()
            response = client.chat.completions.create(
                model=THINK_MODEL,
                messages=full_messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            content = response.choices[0].message.content or ""
            if attempt > 0:
                logger.info(f"think_complete succeeded after {attempt} retries")
            return content
            
        except Exception as e:
            last_error = e
            logger.warning(f"think_complete attempt {attempt + 1}/{max_retries} failed: {e}")
            
            if attempt < max_retries - 1:
                # Exponential backoff
                wait_time = retry_delay * (2 ** attempt)
                logger.debug(f"Retrying in {wait_time:.1f}s...")
                time.sleep(wait_time)
            else:
                logger.error(f"think_complete failed after {max_retries} attempts")
    
    raise Exception(f"LLM completion failed after {max_retries} retries: {str(last_error)}")


# ─── Asynchronous Completion Functions ───────────────────────────────────────

async def fast_complete_async(
    messages: List[Dict[str, str]],
    system_prompt: str = "",
    temperature: float = 0.7,
    max_tokens: int = 2048
) -> str:
    """
    Async fast completion.
    
    Args:
        messages: List of message dicts
        system_prompt: System instruction
        temperature: Sampling temperature
        max_tokens: Maximum tokens to generate
        
    Returns:
        Generated text response
    """
    full_messages = []
    if system_prompt:
        full_messages.append({"role": "system", "content": system_prompt})
    full_messages.extend(messages)
    
    try:
        client = _get_async_client()
        response = await client.chat.completions.create(
            model=FAST_MODEL,
            messages=full_messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"Async fast_complete failed: {e}")
        raise


async def think_complete_async(
    messages: List[Dict[str, str]],
    system_prompt: str = "",
    temperature: float = 0.5,
    max_tokens: int = 4096
) -> str:
    """
    Async deep thinking completion.
    
    Args:
        messages: List of message dicts
        system_prompt: System instruction
        temperature: Sampling temperature
        max_tokens: Maximum tokens to generate
        
    Returns:
        Generated text response
    """
    full_messages = []
    if system_prompt:
        full_messages.append({"role": "system", "content": system_prompt})
    full_messages.extend(messages)
    
    try:
        client = _get_async_client()
        response = await client.chat.completions.create(
            model=THINK_MODEL,
            messages=full_messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"Async think_complete failed: {e}")
        raise


# ─── Streaming Functions ────────────────────────────────────────────────────

def stream_complete(
    messages: List[Dict[str, str]],
    system_prompt: str = "",
    temperature: float = 0.7,
    max_tokens: int = 2048
) -> AsyncGenerator[str, None]:
    """
    Stream completion tokens as they arrive.
    
    Args:
        messages: List of message dicts
        system_prompt: System instruction
        temperature: Sampling temperature
        max_tokens: Maximum tokens to generate
        
    Yields:
        Text chunks as they arrive from the API
    """
    full_messages = []
    if system_prompt:
        full_messages.append({"role": "system", "content": system_prompt})
    full_messages.extend(messages)
    
    try:
        client = _get_sync_client()
        with client.chat.completions.create(
            model=FAST_MODEL,
            messages=full_messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True
        ) as response:
            for chunk in response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
    except Exception as e:
        logger.error(f"Stream complete failed: {e}")
        raise


# ─── Health Check ───────────────────────────────────────────────────────────

def health_check() -> bool:
    """
    Check if Groq client is properly initialized and responsive.
    
    Returns:
        True if healthy, False otherwise
    """
    try:
        # Try to get a client
        client = _get_sync_client()
        # Try a minimal API call
        response = client.chat.completions.create(
            model=FAST_MODEL,
            messages=[{"role": "user", "content": "ping"}],
            temperature=0.1,
            max_tokens=10
        )
        logger.info("Groq health check passed")
        return True
    except Exception as e:
        logger.error(f"Groq health check failed: {e}")
        return False
