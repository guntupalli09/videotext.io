# DNS for AI Discovery (DNS-AID) Records

Configure the following DNS records for agent-based discovery of VideoText services.
These records use SVCB/HTTPS record types as defined in [draft-mozleywilliams-dnsop-dnsaid](https://datatracker.ietf.org/doc/draft-mozleywilliams-dnsop-dnsaid/) and [RFC 9460](https://www.rfc-editor.org/rfc/rfc9460).

## Required DNS Records

### Agent Discovery Index

Points agents to the API catalog at `/.well-known/api-catalog`.

```
_index._agents.videotext.io.  IN HTTPS 1 . alpn="h2,h3" endpoint="/.well-known/api-catalog"
```

### Agent-to-Agent (A2A) Discovery

Points agents to the agents discovery endpoint.

```
_a2a._agents.videotext.io.  IN HTTPS 1 . alpn="h2,h3" endpoint="/.well-known/agents.json"
```

### LLM Documentation

Points agents to the LLM-readable documentation.

```
_llm._agents.videotext.io.  IN HTTPS 1 . alpn="h2,h3" endpoint="/llms.txt"
```

## DNSSEC

Sign the `_agents.videotext.io` zone with DNSSEC so that validating resolvers
return authenticated data. This is required by the DNS-AID specification to
prevent spoofing of agent discovery records.

### Steps

1. Enable DNSSEC on your DNS provider (e.g. Cloudflare, Route 53, Google Cloud DNS)
2. Add DS records to the parent zone registrar
3. Verify DNSSEC is active: `dig +dnssec _index._agents.videotext.io HTTPS`

## Verification

Test that records resolve correctly:

```bash
# Check agent discovery index
dig _index._agents.videotext.io HTTPS

# Check A2A discovery
dig _a2a._agents.videotext.io HTTPS

# Check LLM documentation
dig _llm._agents.videotext.io HTTPS

# Verify DNSSEC signatures
dig +dnssec _index._agents.videotext.io HTTPS
```

## References

- [DNS-AID Draft](https://datatracker.ietf.org/doc/draft-mozleywilliams-dnsop-dnsaid/)
- [RFC 9460 - SVCB and HTTPS Resource Records](https://www.rfc-editor.org/rfc/rfc9460)
- [RFC 8288 - Web Linking](https://www.rfc-editor.org/rfc/rfc8288)
