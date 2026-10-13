P = "/api/v1"


def make_form(client, headers, **kw):
    body = {"title": "Customer Feedback", "is_public": True, "allow_response_editing": True, **kw}
    r = client.post(f"{P}/forms", json=body, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def add_field(client, headers, form_id, **kw):
    r = client.post(f"{P}/forms/{form_id}/fields", json=kw, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def build_form(client, headers):
    form = make_form(client, headers)
    fid = form["id"]
    name = add_field(client, headers, fid, label="Name", field_type="text", is_required=True, min_value=2)
    email = add_field(client, headers, fid, label="Email", field_type="email", is_required=True)
    rating = add_field(client, headers, fid, label="Rating", field_type="rating", is_required=True)
    reason = add_field(
        client, headers, fid, label="Why so low?", field_type="text", is_required=True,
        cond_field_id=rating["id"], cond_operator="lt", cond_value="3",
    )
    city = add_field(
        client, headers, fid, label="City", field_type="dropdown",
        options=[{"label": "Chennai"}, {"label": "Madurai"}],
    )
    return form, dict(name=name, email=email, rating=rating, reason=reason, city=city)


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_auth_and_rbac(client, admin, user1):
    assert client.get(f"{P}/auth/me", headers=user1).json()["role_name"] == "user"
    assert client.get(f"{P}/auth/me", headers=admin).json()["role_name"] == "admin"
    assert client.get(f"{P}/users", headers=user1).status_code == 403
    assert client.get(f"{P}/users", headers=admin).status_code == 200
    assert client.get(f"{P}/auth/me").status_code == 401
    bad = client.post(f"{P}/auth/login", json={"email": "u1@example.com", "password": "wrong"})
    assert bad.status_code == 401
    dup = client.post(f"{P}/auth/register", json={"full_name": "X Y", "email": "u1@example.com", "password": "Password@1"})
    assert dup.status_code == 409


def test_refresh_and_oauth_token(client):
    r = client.post(f"{P}/auth/token", data={"username": "admin@example.com", "password": "Admin@12345"})
    assert r.status_code == 200
    r2 = client.post(f"{P}/auth/refresh", json={"refresh_token": r.json()["refresh_token"]})
    assert r2.status_code == 200
    assert client.post(f"{P}/auth/refresh", json={"refresh_token": r.json()["access_token"]}).status_code == 401


def test_form_ownership(client, user1, user2, admin):
    form = make_form(client, user1)
    assert client.put(f"{P}/forms/{form['id']}", json={"title": "Hacked"}, headers=user2).status_code == 403
    assert client.put(f"{P}/forms/{form['id']}", json={"title": "Renamed form"}, headers=admin).status_code == 200
    mine = client.get(f"{P}/forms", headers=user2).json()
    assert all(f["owner_id"] != form["owner_id"] for f in mine["items"])
    assert client.delete(f"{P}/forms/{form['id']}", headers=user1).status_code == 200


def test_field_ordering_and_conditions(client, user1):
    form, f = build_form(client, user1)
    ids = [x["id"] for x in reversed(client.get(f"{P}/forms/{form['id']}/fields", headers=user1).json())]
    r = client.put(f"{P}/forms/{form['id']}/fields/reorder", json={"field_ids": ids}, headers=user1)
    assert [x["id"] for x in r.json()] == ids
    assert client.put(f"{P}/forms/{form['id']}/fields/reorder", json={"field_ids": ids[:-1]}, headers=user1).status_code == 422
    # circular logic rejected
    bad = client.put(
        f"{P}/forms/{form['id']}/fields/{f['rating']['id']}",
        json={"cond_field_id": f["reason"]["id"], "cond_operator": "equals", "cond_value": "x"}, headers=user1,
    )
    assert bad.status_code == 422
    # dropdown without options rejected
    r = client.post(f"{P}/forms/{form['id']}/fields", json={"label": "X", "field_type": "dropdown"}, headers=user1)
    assert r.status_code == 422


def test_public_submission_validation_and_conditions(client, user1):
    form, f = build_form(client, user1)
    slug = form["slug"]
    pub = client.get(f"{P}/public/forms/{slug}")
    assert pub.status_code == 200 and len(pub.json()["fields"]) == 5

    ans = lambda **kv: {"answers": [{"field_id": f[k]["id"], "value": v} for k, v in kv.items()]}  # noqa: E731

    r = client.post(f"{P}/public/forms/{slug}/responses", json=ans(name="A"))
    assert r.status_code == 422
    errs = r.json()["detail"]["errors"]
    assert str(f["name"]["id"]) in errs and str(f["email"]["id"]) in errs and str(f["rating"]["id"]) in errs
    assert str(f["reason"]["id"]) not in errs  # hidden: rating not answered -> rule "lt 3" fails

    low = client.post(f"{P}/public/forms/{slug}/responses", json=ans(name="Asha", email="a@b.co", rating=2))
    assert low.status_code == 422 and str(f["reason"]["id"]) in low.json()["detail"]["errors"]

    ok = client.post(
        f"{P}/public/forms/{slug}/responses",
        json=ans(name="Asha", email="A@B.co", rating=5, reason="ignored", city="Chennai"),
    )
    assert ok.status_code == 201, ok.text

    bad_opt = client.post(f"{P}/public/forms/{slug}/responses", json=ans(name="Asha", email="a@b.co", rating=5, city="Delhi"))
    assert bad_opt.status_code == 422
    bad_rating = client.post(f"{P}/public/forms/{slug}/responses", json=ans(name="Asha", email="a@b.co", rating=9))
    assert bad_rating.status_code == 422


def test_disable_form_blocks_submission(client, user1):
    form, f = build_form(client, user1)
    payload = {"answers": [
        {"field_id": f["name"]["id"], "value": "Zed"},
        {"field_id": f["email"]["id"], "value": "z@z.co"},
        {"field_id": f["rating"]["id"], "value": 4},
    ]}
    assert client.patch(f"{P}/forms/{form['id']}/status", json={"is_active": False}, headers=user1).status_code == 200
    assert client.post(f"{P}/public/forms/{form['slug']}/responses", json=payload).status_code == 403
    assert client.post(f"{P}/forms/{form['id']}/responses", json=payload, headers=user1).status_code == 403
    client.patch(f"{P}/forms/{form['id']}/status", json={"is_active": True}, headers=user1)
    assert client.post(f"{P}/public/forms/{form['slug']}/responses", json=payload).status_code == 201


def test_response_edit_permissions_history_search(client, user1, user2, admin):
    form, f = build_form(client, user1)
    payload = lambda name: {"answers": [  # noqa: E731
        {"field_id": f["name"]["id"], "value": name},
        {"field_id": f["email"]["id"], "value": "s@s.co"},
        {"field_id": f["rating"]["id"], "value": 5},
    ]}
    r = client.post(f"{P}/forms/{form['id']}/responses", json=payload("Sam"), headers=user2)
    assert r.status_code == 201
    rid = r.json()["id"]

    # submitter can edit (form allows), a stranger can't, owner can
    assert client.put(f"{P}/responses/{rid}", json=payload("Samuel"), headers=user2).status_code == 200
    assert client.put(f"{P}/responses/{rid}", json=payload("Hax"), headers=admin).status_code == 200
    stranger = client.post(f"{P}/auth/register", json={"full_name": "Str Anger", "email": "s3@example.com", "password": "Password@1"})
    tok = client.post(f"{P}/auth/login", json={"email": "s3@example.com", "password": "Password@1"}).json()["access_token"]
    assert client.put(f"{P}/responses/{rid}", json=payload("no"), headers={"Authorization": f"Bearer {tok}"}).status_code == 403
    assert client.get(f"{P}/responses/{rid}", headers={"Authorization": f"Bearer {tok}"}).status_code == 403

    # form that does not allow editing
    client.put(f"{P}/forms/{form['id']}", json={"allow_response_editing": False}, headers=user1)
    assert client.put(f"{P}/responses/{rid}", json=payload("Blocked"), headers=user2).status_code == 403
    assert client.put(f"{P}/responses/{rid}", json=payload("OwnerEdit"), headers=user1).status_code == 200

    hist = client.get(f"{P}/responses/{rid}/history", headers=user2).json()
    assert [h["action"] for h in hist] == ["created", "updated", "updated", "updated"]
    assert hist[1]["changes"][0]["old"] == "Sam" and hist[1]["changes"][0]["new"] == "Samuel"

    # search / filter / pagination
    got = client.get(f"{P}/forms/{form['id']}/responses", params={"search": "OwnerEdit"}, headers=user1).json()
    assert got["total"] == 1
    got = client.get(f"{P}/forms/{form['id']}/responses", params={"field_id": f["name"]["id"], "field_value": "zzz"}, headers=user1).json()
    assert got["total"] == 0
    got = client.get(f"{P}/forms/{form['id']}/responses", params={"anonymous": True}, headers=user1).json()
    assert got["total"] == 0
    assert client.get(f"{P}/forms/{form['id']}/responses", headers=user2).status_code == 403
    mine = client.get(f"{P}/responses/mine", headers=user2).json()
    assert mine["total"] >= 1 and mine["items"][0]["form_title"]

    assert client.delete(f"{P}/responses/{rid}", headers=user2).status_code == 403
    assert client.delete(f"{P}/responses/{rid}", headers=user1).status_code == 200


def test_upload_and_file_field(client, user1):
    form = make_form(client, user1)
    fld = add_field(client, user1, form["id"], label="CV", field_type="file", is_required=True)
    up = client.post(f"{P}/uploads", files={"file": ("cv.pdf", b"%PDF-1.4 test", "application/pdf")}, headers=user1)
    assert up.status_code == 201, up.text
    assert client.post(f"{P}/uploads", files={"file": ("x.exe", b"MZ", "application/octet-stream")}, headers=user1).status_code == 415
    r = client.post(f"{P}/forms/{form['id']}/responses", json={"answers": [{"field_id": fld["id"], "value": "../etc/passwd"}]}, headers=user1)
    assert r.status_code == 422
    r = client.post(f"{P}/forms/{form['id']}/responses", json={"answers": [{"field_id": fld["id"], "value": up.json()["file_id"]}]}, headers=user1)
    assert r.status_code == 201
    assert client.get(up.json()["url"], headers=user1).status_code == 200


def test_analytics_exports_activity_and_delete_cascade(client, user1, admin):
    form, f = build_form(client, user1)
    for n, rating in (("Amy", 5), ("Bob", 4), ("Cal", 5)):
        client.post(f"{P}/public/forms/{form['slug']}/responses", json={"answers": [
            {"field_id": f["name"]["id"], "value": n}, {"field_id": f["email"]["id"], "value": "q@q.co"},
            {"field_id": f["rating"]["id"], "value": rating}, {"field_id": f["city"]["id"], "value": "Madurai"},
        ]})
    dash = client.get(f"{P}/analytics/dashboard", headers=user1).json()
    assert dash["total_forms"] >= 1 and dash["total_responses"] >= 3 and len(dash["responses_per_day"]) == 30
    an = client.get(f"{P}/analytics/forms/{form['id']}", headers=user1).json()
    assert an["total_responses"] == 3 and an["anonymous_responses"] == 3
    rating_stat = next(s for s in an["fields"] if s["label"] == "Rating")
    assert rating_stat["average"] == 4.67 and rating_stat["distribution"]["5"] == 2
    city_stat = next(s for s in an["fields"] if s["label"] == "City")
    assert city_stat["distribution"] == {"Chennai": 0, "Madurai": 3}

    x = client.get(f"{P}/forms/{form['id']}/export/excel", headers=user1)
    assert x.status_code == 200 and x.content[:2] == b"PK"
    p = client.get(f"{P}/forms/{form['id']}/export/pdf", headers=user1)
    assert p.status_code == 200 and p.content[:4] == b"%PDF"

    logs = client.get(f"{P}/activity-logs", params={"action": "form."}, headers=admin).json()
    assert logs["total"] >= 1
    own = client.get(f"{P}/activity-logs", headers=user1).json()
    assert all(i["user_id"] is not None for i in own["items"])

    dup = client.post(f"{P}/forms/{form['id']}/duplicate", headers=user1)
    assert dup.status_code == 201 and len(dup.json()["fields"]) == 5
    reason_copy = next(x for x in dup.json()["fields"] if x["label"] == "Why so low?")
    assert reason_copy["cond_field_id"] in [x["id"] for x in dup.json()["fields"]]

    assert client.delete(f"{P}/forms/{form['id']}/fields/{f['rating']['id']}", headers=user1).status_code == 200
    fields = client.get(f"{P}/forms/{form['id']}/fields", headers=user1).json()
    assert next(x for x in fields if x["label"] == "Why so low?")["cond_field_id"] is None
    assert client.delete(f"{P}/forms/{form['id']}", headers=user1).status_code == 200
    assert client.get(f"{P}/forms/{form['id']}", headers=user1).status_code == 404
