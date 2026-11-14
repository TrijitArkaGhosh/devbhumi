import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import pytest
import core, seed


@pytest.fixture
def db():
    con = core.connect()
    core.init_db(con)
    toks = seed.seed(con)
    return con, toks
